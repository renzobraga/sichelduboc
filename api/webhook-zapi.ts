import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./firebase-admin.js";
import { createGoogleEvent } from "./google-calendar.js";

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;
    
    // Z-API sends events like 'onMessage'
    if (data && data.phone && data.isGroup !== true && data.isGroup !== "true" && data.fromMe !== true && data.fromMe !== "true") {
      let messageText = "";
      
      // Prioritize button/interactive responses first
      if (data.buttonResponseMessage && data.buttonResponseMessage.selectedDisplayText) {
        messageText = data.buttonResponseMessage.selectedDisplayText;
      } else if (data.listResponseMessage && data.listResponseMessage.title) {
        messageText = data.listResponseMessage.title;
      } else if (data.templateButtonReplyMessage && data.templateButtonReplyMessage.selectedDisplayText) {
        messageText = data.templateButtonReplyMessage.selectedDisplayText;
      } else if (data.interactiveResponseMessage && data.interactiveResponseMessage.body && data.interactiveResponseMessage.body.text) {
        messageText = data.interactiveResponseMessage.body.text;
      } else if (data.interactiveResponseMessage && data.interactiveResponseMessage.nativeFlowResponseMessage) {
        try {
          const params = JSON.parse(data.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson || "{}");
          if (params.id) messageText = params.id;
        } catch (e) {}
      } else if (data.button && data.button.text) {
        messageText = data.button.text;
      } else if (data.extendedTextMessage && data.extendedTextMessage.text) {
        messageText = data.extendedTextMessage.text;
      } else if (data.text && typeof data.text === 'string') {
        messageText = data.text;
      } else if (data.text && data.text.message) {
        messageText = data.text.message;
      } else if (data.message && data.message.buttonResponseMessage) {
        messageText = data.message.buttonResponseMessage.selectedDisplayText;
      } else if (data.message && data.message.templateButtonReplyMessage) {
        messageText = data.message.templateButtonReplyMessage.selectedDisplayText;
      }

      // Se ainda não achou, tenta buscar em qualquer lugar do objeto (fallback extremo)
      if (!messageText) {
        const dataStr = JSON.stringify(data);
        const match = dataStr.match(/"selectedDisplayText":"([^"]+)"/);
        if (match) messageText = match[1];
      }

      if (!messageText) {
        console.log("Payload não reconhecido como texto:", JSON.stringify(data));
        return res.status(200).json({ success: true, message: "Not a text or button message" });
      }

      const phone = data.phone;
      const senderName = data.senderName || data.senderShortName || "Cliente (Via WhatsApp)";
      
      console.log(`Mensagem recebida de ${phone} (${senderName}): ${messageText}`);

      // 1. Encontrar o Lead pelo telefone usando dbAdmin (bypassa regras de segurança)
      let leadsSnapshot = await dbAdmin.collection('leads')
        .where('telefone', '==', phone)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      // Se não encontrou, tentar com ou sem o 9 (para números do Brasil)
      if (leadsSnapshot.empty && phone.startsWith('55') && phone.length >= 12) {
        let altPhone = '';
        if (phone.length === 13) {
          // Remover o 9 (ex: 5511999999999 -> 551199999999)
          altPhone = phone.substring(0, 4) + phone.substring(5);
        } else if (phone.length === 12) {
          // Adicionar o 9 (ex: 551199999999 -> 5511999999999)
          altPhone = phone.substring(0, 4) + '9' + phone.substring(4);
        }
        
        if (altPhone) {
          console.log(`Tentando buscar lead com telefone alternativo: ${altPhone}`);
          leadsSnapshot = await dbAdmin.collection('leads')
            .where('telefone', '==', altPhone)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        }
      }

      let leadDoc;
      let leadId;
      let leadData;

      if (!leadsSnapshot.empty) {
        leadDoc = leadsSnapshot.docs[0];
        leadId = leadDoc.id;
        leadData = leadDoc.data();
      } else {
        const triggerMessage = "quero iniciar minha análise gratuita";
        if (messageText.toLowerCase().includes(triggerMessage) || messageText.toLowerCase().includes("iniciar análise")) {
          console.log(`Mensagem de gatilho detectada! Criando novo lead para ${phone}`);
          const newLead = {
            telefone: phone,
            nome: senderName,
            status: "novo",
            aiEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            origem: "Botão WhatsApp Site"
          };
          const leadRef = await dbAdmin.collection('leads').add(newLead);
          leadDoc = await leadRef.get();
          leadId = leadDoc.id;
          leadData = leadDoc.data();
        } else {
          console.log(`Lead não encontrado e não é mensagem de gatilho: ${phone}`);
          return res.status(200).json({ success: true, message: "Ignored" });
        }
      }

      if (leadDoc && leadData) {
        // 2. Salvar a mensagem recebida com deduplicação
        const messageId = data.messageId;
        const msgDocId = messageId ? `zapi_${messageId}` : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        try {
          await dbAdmin.collection('messages').doc(msgDocId).create({
            leadId,
            text: messageText,
            sender: 'user',
            messageId: messageId || null,
            createdAt: new Date().toISOString()
          });
        } catch (e: any) {
          // Se o documento já existe (código 6 no gRPC do Firebase Admin), ignorar
          if (e.code === 6 || e.message.includes('ALREADY_EXISTS')) {
            console.log(`Mensagem duplicada recebida e ignorada (messageId: ${messageId})`);
            return res.status(200).json({ success: true, message: "Already processed" });
          }
          console.error("Erro ao salvar mensagem:", e);
          throw e;
        }

        // 3. Atualizar o status do lead se for 'novo'
        if (leadData.status === 'novo') {
          await dbAdmin.collection('leads').doc(leadId).update({
            status: 'em_atendimento',
            updatedAt: new Date().toISOString()
          });
          leadData.status = 'em_atendimento';
        }
        
        // 4. Lógica do Chatbot (IA)
        if (leadData.aiEnabled !== false) {
          try {
            const { GoogleGenAI, Type } = await import("@google/genai");
            
            let apiKey = process.env.CHAVE_IA_GEMINI || process.env.GEMINI_API_KEY;
            if (apiKey) {
              apiKey = apiKey.replace(/['"]/g, '').trim();
            }
            
            if (apiKey && !apiKey.includes("AI Studio Free Tier")) {
              const ai = new GoogleGenAI({ apiKey });
              
              // Buscar histórico recente de mensagens do lead
              const historySnapshot = await dbAdmin.collection('messages')
                .where('leadId', '==', leadId)
                .orderBy('createdAt', 'desc')
                .limit(15)
                .get();
                
              const history = historySnapshot.docs.map(d => d.data()).reverse();
              
              // Buscar prompts de chat customizados
              let customChatPrompt = "";
              let workflowPrompts: any = {};
              try {
                const promptsDoc = await dbAdmin.collection('settings').doc('prompts').get();
                if (promptsDoc.exists) {
                  workflowPrompts = promptsDoc.data();
                }
                
                const chatPromptDoc = await dbAdmin.collection('settings').doc('ai_chat_prompt').get();
                if (chatPromptDoc.exists) {
                  customChatPrompt = chatPromptDoc.data()?.text || "";
                }
              } catch (e) {
                console.error("Erro ao buscar prompts customizados:", e);
              }
              
                const p = {
                  prompt1: workflowPrompts.prompt1 || 'Olá! Sou o assistente virtual do escritório Sichel & Duboc. Vi que você tem interesse na restituição de Imposto de Renda sobre previdência complementar. Para começar, você recebe ou recebeu aposentadoria de fundo de previdência privada (como PREVI, PETROS, FUNCEF, etc)? [BUTTONS: Sim | Não]',
                  prompt2: workflowPrompts.prompt2 || 'Ótimo! Segunda pergunta: Você contribuiu para esse fundo de previdência entre os anos de 1989 e 1995? [BUTTONS: Sim | Não]',
                  prompt3: workflowPrompts.prompt3 || 'Quase lá! Última pergunta: Atualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar? [BUTTONS: Sim | Não]',
                  prompt4: workflowPrompts.prompt4 || 'Excelente notícia! Você preenche os requisitos para buscar a restituição. Nossa equipe vai preparar sua análise. Qual é o seu nome completo?',
                  prompt5: workflowPrompts.prompt5 || 'Tudo anotado! Precisaremos de alguns documentos: RG, Comprovante de Residência, Contracheque e Declaração de IR. Consegue me enviar hoje? [BUTTONS: Sim, envio hoje | Envio depois]',
                  promptDesq: workflowPrompts.promptDesq || 'Compreendo. Analisando as suas respostas, verificamos que o seu perfil não se enquadra nos requisitos para esta ação. Agradecemos o contato!',
                  promptObjections: workflowPrompts.promptObjections || 'Entendo que possa ter dúvidas ou precise de mais tempo. Gostaria de agendar uma breve reunião com um de nossos advogados especialistas para esclarecer tudo, ou prefere tirar suas dúvidas por aqui mesmo? [BUTTONS: Agendar Reunião | Tirar Dúvidas]',
                  promptSchedule: workflowPrompts.promptSchedule || 'Ótimo! Por favor, escolha o melhor dia e horário diretamente na nossa agenda clicando neste link: [LINK DO GOOGLE CALENDAR]. Um de nossos especialistas ligará para você no horário marcado.',
                  promptContract: workflowPrompts.promptContract || 'Perfeito! Recebi os documentos. Vou encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Como combinamos, os honorários são cobrados apenas no êxito. Clique no link abaixo para ler e assinar digitalmente: [LINK PARA ASSINATURA DO CONTRATO]',
                  promptClosing: workflowPrompts.promptClosing || 'Contrato recebido e validado com sucesso! ✅ Parabéns por dar esse passo importante para recuperar o que é seu por direito. A partir de agora, o escritório Sichel & Duboc cuida de tudo. Seja muito bem-vindo(a)!',
                  promptTrust: workflowPrompts.promptTrust || 'Entendo a sua preocupação. O escritório Sichel & Duboc é registrado na OAB/RJ sob o número 181.046 e no CNPJ 48.319.240/0001-80. Você pode verificar no site do Conselho Federal da OAB. Nosso site é [sichelduboc.com.br]. A tese é baseada na Lei 7.713/88 e tem jurisprudência favorável.',
                  promptFees: workflowPrompts.promptFees || 'O escritório trabalha no modelo de honorários de êxito, ou seja, você não paga nada adiantado. Nossos honorários são um percentual combinado em contrato, cobrado apenas quando você ganhar a ação.',
                };

                const primeiroNome = leadData.nome ? leadData.nome.split(' ')[0] : 'Cliente';
                
                const promptText = `
                  Você é o assistente virtual do escritório de advocacia Sichel & Duboc, especialista em direito previdenciário e tributário.
                  Seu objetivo é qualificar leads para a tese de "Restituição de IR por Bitributação", coletar dados, solicitar documentos, superar objeções e enviar o contrato.

                  DADOS DO LEAD ATUAL:
                  - Nome: ${leadData.nome || 'Não informado'}
                  - E-mail: ${leadData.email || 'Não informado'}
                  - Cidade: ${leadData.cidade || 'Não informado'}
                  - Fundo: ${leadData.fundoPrevidencia || 'Não informado'}
                  - Status: ${leadData.status}
                  - ID: ${leadId}

                  DIRETRIZES DE CONVERSA (Use estas mensagens como base):
                  1. Triagem 1: "${p.prompt1}"
                  2. Triagem 2: "${p.prompt2}"
                  3. Triagem 3: "${p.prompt3}"
                  4. Qualificação: "${p.prompt4}"
                  5. Documentos: "${p.prompt5}"
                  6. Desqualificação: "${p.promptDesq}"
                  7. Objeções Gerais: "${p.promptObjections}"
                  8. Dúvida sobre Segurança/Golpe: "${p.promptTrust}"
                  9. Dúvida sobre Valores/Honorários: "${p.promptFees}"
                  10. Agendamento: "${p.promptSchedule}"
                  11. Envio de Contrato: "${p.promptContract}"
                  12. Fechamento: "${p.promptClosing}"

                  INSTRUÇÕES IMPORTANTES:
                  - Chame o lead pelo nome (${primeiroNome}) sempre que possível.
                  - Use botões no formato [BUTTONS: Opção 1 | Opção 2]. O texto do botão DEVE ter no máximo 20 caracteres.
                  - Se o lead informar nome, e-mail, cidade ou fundo, use a ferramenta 'updateLeadData' IMEDIATAMENTE.
                  - Se o lead estiver pronto para o contrato, use 'createContract'.
                  - Se o lead pedir reunião, use 'scheduleMeeting'.
                  - Se o lead fizer uma pergunta que você não sabe responder ou quiser falar com um humano, use a palavra [ESCAPE] na resposta.

                  HISTÓRICO RECENTE:
                  ${history.map(m => `${m.sender === 'user' ? 'Lead' : 'Você'}: ${m.text}`).join('\n')}

                  MENSAGEM ATUAL DO LEAD:
                  ${messageText}
                `;

              const scheduleMeetingDeclaration: any = {
                name: "scheduleMeeting",
                description: "Agenda uma reunião no Google Calendar. Use esta função quando o lead quiser marcar uma reunião ou ligação.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    summary: {
                      type: Type.STRING,
                      description: "Título da reunião, ex: 'Reunião com [Nome do Lead]'",
                    },
                    description: {
                      type: Type.STRING,
                      description: "Descrição da reunião, incluindo o telefone do lead e o assunto.",
                    },
                    startTime: {
                      type: Type.STRING,
                      description: "Data e hora de início no formato ISO 8601 (ex: 2026-03-20T14:00:00-03:00). Lembre-se que o fuso horário é de Brasília (America/Sao_Paulo).",
                    },
                    endTime: {
                      type: Type.STRING,
                      description: "Data e hora de término no formato ISO 8601 (ex: 2026-03-20T15:00:00-03:00). A reunião geralmente dura 1 hora.",
                    },
                  },
                  required: ["summary", "description", "startTime", "endTime"],
                },
              };

              const createContractDeclaration: any = {
                name: "createContract",
                description: "Gera um contrato digital na ZapSign para o lead assinar. Use esta função quando o lead estiver qualificado e pronto para fechar o contrato.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    leadId: {
                      type: Type.STRING,
                      description: "O ID do lead no sistema.",
                    },
                    name: {
                      type: Type.STRING,
                      description: "Nome completo do lead.",
                    },
                    email: {
                      type: Type.STRING,
                      description: "E-mail do lead.",
                    },
                  },
                  required: ["leadId", "name", "email"],
                },
              };

              const updateLeadDataDeclaration: any = {
                name: "updateLeadData",
                description: "Atualiza os dados do lead no sistema (nome, e-mail, cidade, fundo de previdência). Use sempre que o lead fornecer uma dessas informações.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    email: { type: Type.STRING },
                    cidade: { type: Type.STRING },
                    fundoPrevidencia: { type: Type.STRING }
                  }
                }
              };

              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: promptText,
                config: {
                  tools: [{ functionDeclarations: [scheduleMeetingDeclaration, createContractDeclaration, updateLeadDataDeclaration] }],
                  systemInstruction: `A data e hora atual é: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília). Use isso como referência para agendar reuniões. Se o lead pedir para agendar uma reunião, use a ferramenta scheduleMeeting. Se o lead estiver pronto para assinar o contrato, use a ferramenta createContract. Use updateLeadData sempre que o lead informar dados pessoais.`,
                }
              });
              
              let aiResponseText = response.text || "";
              
              // Handle function calls
              if (response.functionCalls && response.functionCalls.length > 0) {
                for (const call of response.functionCalls) {
                  if (call.name === "scheduleMeeting") {
                    try {
                      const args = call.args as any;
                      await createGoogleEvent(args.summary, args.description, args.startTime, args.endTime);
                      const formattedDate = new Date(args.startTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                      aiResponseText = `Reunião agendada com sucesso para ${formattedDate}! Nossa equipe entrará em contato no horário marcado.`;
                    } catch (err) {
                      console.error("Erro ao agendar reunião:", err);
                      aiResponseText = "Infelizmente não consegui agendar a reunião automaticamente no momento. Por favor, aguarde que um de nossos especialistas entrará em contato para agendar.";
                    }
                  } else if (call.name === "createContract") {
                    try {
                      const args = call.args as any;
                      console.log(`Gerando contrato para ${args.name} (${args.email})...`);
                      
                      // Chamar API interna para criar contrato
                      const contractResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/create-contract`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          leadId: args.leadId,
                          name: args.name,
                          email: args.email
                        })
                      });
                      
                      const contractData = await contractResponse.json();
                      if (contractData.success && contractData.signUrl) {
                        aiResponseText = `Perfeito, ${args.name.split(' ')[0]}! Acabei de gerar o seu contrato. Você pode ler e assinar digitalmente pelo seu celular clicando no link abaixo:\n\n${contractData.signUrl}\n\nA assinatura é rápida e tem total validade jurídica. Assim que assinar, me avise aqui!`;
                      } else {
                        throw new Error(contractData.error || "Erro ao gerar link do contrato");
                      }
                    } catch (err) {
                      console.error("Erro ao criar contrato:", err);
                      aiResponseText = "Tive um pequeno problema técnico ao gerar o seu contrato agora. Mas não se preocupe, nossa equipe vai te enviar o link manualmente em instantes!";
                    }
                  } else if (call.name === "updateLeadData") {
                    try {
                      const updates = call.args as any;
                      console.log(`Atualizando dados do lead ${leadId}:`, updates);
                      await dbAdmin.collection('leads').doc(leadId).update({
                        ...updates,
                        updatedAt: new Date().toISOString()
                      });
                    } catch (err) {
                      console.error("Erro ao atualizar dados do lead:", err);
                    }
                  }
                }
              }
              
              if (aiResponseText) {
                // Parse buttons if the AI included them, e.g., [BUTTONS: Sim | Não]
                const buttonRegex = /\[BUTTONS:\s*(.+?)\]/i;
                const buttonMatch = aiResponseText.match(buttonRegex);
                let buttons: string[] = [];
                
                if (buttonMatch) {
                  buttons = buttonMatch[1].split('|').map(b => b.trim()).filter(b => b);
                  aiResponseText = aiResponseText.replace(buttonRegex, '').trim();
                }

                // Enviar a resposta via Z-API
                const zApiInstance = process.env.ZAPI_INSTANCE || "3F04463B905D722D1841026B50D22DF4";
                const zApiToken = process.env.ZAPI_TOKEN || "DA7B3B0DBC0D106EAB56DF63";
                
                let zApiUrl = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-text`;
                let zApiBody: any = { phone, message: aiResponseText };

                if (buttons.length > 0 && buttons.length <= 3) {
                  console.log(`Enviando botões: ${buttons.join(', ')}`);
                  zApiUrl = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-button-list`;
                  zApiBody = {
                    phone,
                    message: aiResponseText,
                    buttonList: {
                      buttons: buttons.map((label, index) => {
                        const cleanLabel = label.substring(0, 20).trim();
                        if (label.length > 20) {
                          console.warn(`Botão cortado: "${label}" -> "${cleanLabel}"`);
                        }
                        return {
                          id: String(index + 1),
                          label: cleanLabel
                        };
                      })
                    }
                  };
                }
                
                const zApiHeaders: Record<string, string> = { "Content-Type": "application/json" };
                if (process.env.ZAPI_CLIENT_TOKEN) {
                  zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
                }

                const zApiResponse = await fetch(zApiUrl, {
                  method: "POST",
                  headers: zApiHeaders,
                  body: JSON.stringify(zApiBody)
                });
                
                const zApiResultText = await zApiResponse.text();
                if (!zApiResponse.ok) {
                  console.error("Erro ao enviar mensagem via Z-API:", zApiResponse.status, zApiResultText);
                  
                  // Fallback: se falhar ao enviar botões, tenta enviar como texto normal
                  if (zApiUrl.includes("send-button-list")) {
                    console.log("Tentando fallback para texto normal...");
                    const fallbackUrl = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-text`;
                    const fallbackBody = { 
                      phone, 
                      message: aiResponseText + "\n\nResponda com:\n" + buttons.map(b => `- ${b}`).join('\n') 
                    };
                    
                    await fetch(fallbackUrl, {
                      method: "POST",
                      headers: zApiHeaders,
                      body: JSON.stringify(fallbackBody)
                    });
                  }
                }
                
                // Salvar a resposta da IA no Firestore
                await dbAdmin.collection('messages').add({
                  leadId,
                  text: aiResponseText + (buttons.length > 0 ? `\n[Botões: ${buttons.join(' | ')}]` : ''),
                  sender: 'bot',
                  createdAt: new Date().toISOString()
                });

                // Desativar IA se for a mensagem de escape
                if (aiResponseText.includes("Vou passar você para um dos nossos especialistas")) {
                  await dbAdmin.collection('leads').doc(leadId).update({
                    aiEnabled: false,
                    updatedAt: new Date().toISOString()
                  });
                }
              }
            }
          } catch (aiError) {
            console.error("Erro ao gerar/enviar resposta da IA no webhook:", aiError);
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro no webhook da Z-API:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
}

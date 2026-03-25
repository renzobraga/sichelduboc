import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./_firebase-admin.js";
import { createGoogleEvent } from "./_google-calendar.js";

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;
    
    // Z-API sends events like 'onMessage'
    if (data && data.phone && data.isGroup !== true && data.isGroup !== "true" && data.fromMe !== true && data.fromMe !== "true") {
      let messageText = "";
      let fileUrl = "";
      let fileName = "";
      let fileType = "";
      
      // Handle Media Messages from Z-API
      if (data.image && data.image.url) {
        fileUrl = data.image.url;
        fileType = "image";
        messageText = data.image.caption || "[Imagem]";
      } else if (data.video && data.video.url) {
        fileUrl = data.video.url;
        fileType = "video";
        messageText = data.video.caption || "[Vídeo]";
      } else if (data.audio && data.audio.url) {
        fileUrl = data.audio.url;
        fileType = "audio";
        messageText = "[Áudio]";
      } else if (data.document && data.document.url) {
        fileUrl = data.document.url;
        fileType = "document";
        fileName = data.document.fileName || "documento";
        messageText = data.document.caption || `[Documento: ${fileName}]`;
      } else if (data.sticker && data.sticker.url) {
        fileUrl = data.sticker.url;
        fileType = "sticker";
        messageText = "[Sticker]";
      }

      // Prioritize button/interactive responses first if not a media message with caption
      if (!messageText) {
        if (data.buttonResponseMessage && data.buttonResponseMessage.selectedDisplayText) {
          messageText = data.buttonResponseMessage.selectedDisplayText;
        } else if (data.listResponseMessage && data.listResponseMessage.title) {
          messageText = data.listResponseMessage.title;
        } else if (data.templateButtonReplyMessage && data.templateButtonReplyMessage.selectedDisplayText) {
          messageText = data.templateButtonReplyMessage.selectedDisplayText;
        } else if (data.interactiveResponseMessage) {
          if (data.interactiveResponseMessage.buttonReply && data.interactiveResponseMessage.buttonReply.title) {
            messageText = data.interactiveResponseMessage.buttonReply.title;
          } else if (data.interactiveResponseMessage.listReply && data.interactiveResponseMessage.listReply.title) {
            messageText = data.interactiveResponseMessage.listReply.title;
          } else if (data.interactiveResponseMessage.body && data.interactiveResponseMessage.body.text) {
            messageText = data.interactiveResponseMessage.body.text;
          } else if (data.interactiveResponseMessage.nativeFlowResponseMessage) {
            try {
              const params = JSON.parse(data.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson || "{}");
              if (params.id) messageText = params.id;
            } catch (e) {}
          }
        } else if (data.button && data.button.text) {
          messageText = data.button.text;
        } else if (data.extendedTextMessage && data.extendedTextMessage.text) {
          messageText = data.extendedTextMessage.text;
        } else if (data.text && typeof data.text === 'string') {
          messageText = data.text;
        } else if (data.text && data.text.message) {
          messageText = data.text.message;
        } else if (data.message) {
          if (typeof data.message === 'string') {
            messageText = data.message;
          } else if (data.message.text && typeof data.message.text === 'string') {
            messageText = data.message.text;
          } else if (data.message.buttonResponseMessage && data.message.buttonResponseMessage.selectedDisplayText) {
            messageText = data.message.buttonResponseMessage.selectedDisplayText;
          } else if (data.message.templateButtonReplyMessage && data.message.templateButtonReplyMessage.selectedDisplayText) {
            messageText = data.message.templateButtonReplyMessage.selectedDisplayText;
          } else if (data.message.interactiveResponseMessage) {
            if (data.message.interactiveResponseMessage.buttonReply && data.message.interactiveResponseMessage.buttonReply.title) {
              messageText = data.message.interactiveResponseMessage.buttonReply.title;
            } else if (data.message.interactiveResponseMessage.listReply && data.message.interactiveResponseMessage.listReply.title) {
              messageText = data.message.interactiveResponseMessage.listReply.title;
            } else if (data.message.interactiveResponseMessage.body && data.message.interactiveResponseMessage.body.text) {
              messageText = data.message.interactiveResponseMessage.body.text;
            }
          } else if (data.message.conversation) {
            messageText = data.message.conversation;
          } else if (data.message.extendedTextMessage && data.message.extendedTextMessage.text) {
            messageText = data.message.extendedTextMessage.text;
          }
        }
      }

      // Se ainda não achou, tenta buscar em qualquer lugar do objeto (fallback extremo)
      if (!messageText) {
        const dataStr = JSON.stringify(data);
        const match = dataStr.match(/"selectedDisplayText":"([^"]+)"/);
        if (match) {
          messageText = match[1];
        } else {
          const titleMatch = dataStr.match(/"title":"([^"]+)"/);
          if (titleMatch) messageText = titleMatch[1];
        }
      }

      if (!messageText) {
        console.log("Payload não reconhecido como texto:", JSON.stringify(data));
        return res.status(200).json({ success: true, message: "Not a text or button message" });
      }

      const rawPhone = String(data.phone);
      const phone = rawPhone.replace(/\D/g, "");
      const senderName = data.senderName || data.senderShortName || "Cliente (Via WhatsApp)";
      
      console.log(`Mensagem recebida de ${phone} (${senderName}): ${messageText}`);

      // 1. Encontrar o Lead pelo telefone usando dbAdmin (bypassa regras de segurança)
      // Tenta busca exata primeiro
      let leadsSnapshot = await dbAdmin.collection('leads')
        .where('telefone', '==', phone)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      // Se não encontrou, tenta buscar por variações (com/sem 9, com/sem 55)
      if (leadsSnapshot.empty) {
        let phoneVariations = [];
        
        // Se tem 55, tenta sem 55
        if (phone.startsWith('55')) {
          phoneVariations.push(phone.substring(2));
        } else {
          // Se não tem 55, tenta com 55
          phoneVariations.push('55' + phone);
        }

        // Variações do 9º dígito para números do Brasil
        if (phone.startsWith('55')) {
          if (phone.length === 13) {
            // Remover o 9 (ex: 5511999999999 -> 551199999999)
            phoneVariations.push(phone.substring(0, 4) + phone.substring(5));
          } else if (phone.length === 12) {
            // Adicionar o 9 (ex: 551199999999 -> 5511999999999)
            phoneVariations.push(phone.substring(0, 4) + '9' + phone.substring(4));
          }
        }

        // Tenta buscar por cada variação
        for (const variation of phoneVariations) {
          if (variation) {
            console.log(`Tentando buscar lead com telefone alternativo: ${variation}`);
            leadsSnapshot = await dbAdmin.collection('leads')
              .where('telefone', '==', variation)
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get();
            if (!leadsSnapshot.empty) break;
          }
        }
      }

      // Fallback final: busca pelos últimos 8 ou 9 dígitos (mais arriscado, mas pega casos estranhos)
      if (leadsSnapshot.empty && phone.length >= 8) {
        const last8 = phone.slice(-8);
        console.log(`Tentando busca por sufixo (últimos 8 dígitos): ${last8}`);
        // Nota: Firestore não suporta 'ends-with', então buscamos todos e filtramos (limitado a 10 para performance)
        const allLeads = await dbAdmin.collection('leads').limit(10).get();
        const matchingLead = allLeads.docs.find(doc => {
          const t = doc.data().telefone;
          return t && t.endsWith(last8);
        });
        
        if (matchingLead) {
          console.log(`Lead encontrado por sufixo: ${matchingLead.id}`);
          // Mocking snapshot for the rest of the logic
          leadsSnapshot = { empty: false, docs: [matchingLead] } as any;
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
            createdAt: new Date().toISOString(),
            fileUrl: fileUrl || null,
            fileName: fileName || null,
            fileType: fileType || null
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

        let isNewLead = false;
        // 3. Atualizar o status do lead se for 'novo'
        if (leadData.status === 'novo') {
          isNewLead = true;
          await dbAdmin.collection('leads').doc(leadId).update({
            status: 'em_atendimento',
            updatedAt: new Date().toISOString()
          });
          leadData.status = 'em_atendimento';
        }
        
        // 4. Lógica do Chatbot (IA)
        console.log(`[Webhook] Processando lead ${leadId} (${leadData.nome || 'Sem nome'}). Status: ${leadData.status}. AI Enabled: ${leadData.aiEnabled !== false}`);
        
        if (leadData.aiEnabled !== false) {
          try {
            const { GoogleGenAI, Type } = await import("@google/genai");
            
            let apiKey = process.env.CHAVE_IA_GEMINI || process.env.GEMINI_API_KEY;
            if (apiKey) {
              apiKey = apiKey.replace(/['"]/g, '').trim();
            } else {
              console.error("[IA] API Key não encontrada! Verifique GEMINI_API_KEY ou CHAVE_IA_GEMINI.");
            }
            
            if (apiKey) {
              const ai = new GoogleGenAI({ apiKey });
              
              console.log(`[IA] Iniciando geração para ${leadId}...`);
              
              const cleanAIResponse = (text: string) => {
                let cleaned = text.trim().replace(/^["']|["']$/g, '').trim();
                cleaned = cleaned.replace(/\*/g, '').trim();
                
                const lines = cleaned.split('\n');
                const filteredLines = lines.filter(line => {
                  const lowerLine = line.toLowerCase();
                  return !lowerLine.includes('apenas escreva') && 
                         !lowerLine.includes('lembre-se:') && 
                         !lowerLine.includes('use o prompt') &&
                         !lowerLine.includes('triagem') &&
                         !lowerLine.startsWith('ok') &&
                         !lowerLine.startsWith('entendido');
                });
                return filteredLines.join('\n').trim();
              };
              
              // Buscar histórico recente de mensagens do lead
              const historySnapshot = await dbAdmin.collection('messages')
                .where('leadId', '==', leadId)
                .orderBy('createdAt', 'desc')
                .limit(20)
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
                  prompt1: workflowPrompts.prompt1 || 'Olá! Que bom ter você aqui! 👋\n\nMeu nome é Alice e faço parte da equipe de atendimento do Escritório Sichel & Duboc Advogados Associados, especialistas em Direito Previdenciário e Tributário.\n\nComo eu posso te chamar?',
                  promptForm: workflowPrompts.promptForm || 'Olá, {nome}! Tudo bem? 👋\n\nMeu nome é Alice e faço parte da equipe de atendimento do Escritório Sichel & Duboc Advogados Associados.\n\nRecebemos o seu contato pelo nosso site, podemos iniciar o atendimento?',
                  prompt2: workflowPrompts.prompt2 || 'Prazer em te conhecer, {nome}!\n\nMuitos aposentados como você estão conseguindo recuperar valores significativos de Imposto de Renda que foram cobrados indevidamente. E o melhor: você pode ser um deles!\n\nPara te ajudar a verificar se você tem esse direito, preciso fazer apenas 3 perguntinhas rápidas. Leva menos de 2 minutinhos, prometo! 😉\n\nPodemos começar?',
                  prompt3: workflowPrompts.prompt3 || 'Perfeito! Vamos à primeira pergunta:\n\nVocê recebe aposentadoria de alguma previdência complementar que NÃO seja paga pelo INSS?\n(Por exemplo: Petros, Funcef, Previ, Banesprev, Valia, Sistel, BNDES, Banco do Brasil, Rede Ferroviária, entre outros.)',
                  prompt4: workflowPrompts.prompt4 || 'Ótimo! Agora, a segunda pergunta:\n\nVocê contribuiu para esse fundo de previdência entre os anos de 1989 e 1995?',
                  prompt5: workflowPrompts.prompt5 || 'Quase lá! A última pergunta para a gente saber se você tem direito é:\n\nAtualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar?',
                  prompt6: workflowPrompts.prompt6 || 'Que notícia maravilhosa! 🥳\n\nCom base nas suas respostas, você preenche todos os requisitos para buscar a restituição do Imposto de Renda que foi cobrado indevidamente! Nossa equipe já está pronta para preparar a sua análise personalizada.\n\nComo já tenho o seu nome, preciso apenas de mais dois dados básicos para abrir sua pasta: Qual é o seu melhor e-mail e a sua cidade/estado?',
                  prompt7: workflowPrompts.prompt7 || 'Tudo anotado, {nome}! Sua pasta já está sendo aberta pela nossa equipe aqui no escritório. O Escritório Sichel & Duboc (OAB/RJ 181.046) trabalha com total transparência e segurança.\n\nPrecisaremos de alguns documentos simples:\n1. Identidade\n2. Comprovante de Residência\n3. Contracheque\n4. Declaração de IR\n\nConsegue me enviar fotos ou PDFs desses documentos hoje?',
                  promptDesq: workflowPrompts.promptDesq || 'Entendi perfeitamente. Agradeço muito a sua sinceridade!\n\nAnalisando suas respostas, percebo que, neste momento, o seu caso não se encaixa nos requisitos específicos que a Justiça exige para essa ação de restituição por bitributação.\n\nO Escritório Sichel & Duboc está sempre à disposição para outras demandas. Tenha um excelente dia!',
                  promptObjections: workflowPrompts.promptObjections || 'Entendo perfeitamente a sua preocupação, {nome}, e é muito importante que você se sinta seguro(a)!\n\nO Escritório Sichel & Duboc é totalmente regularizado (OAB/RJ 181.046). Gostaria de agendar uma breve reunião ou prefere tirar suas dúvidas por aqui?',
                  promptSchedule: workflowPrompts.promptSchedule || 'Claro! Por favor, escolha o melhor dia e horário diretamente na nossa agenda clicando neste link:\n[LINK DO GOOGLE CALENDAR]\n\nUm de nossos especialistas ligará para você no horário marcado.',
                  promptContract: workflowPrompts.promptContract || 'Perfeito, {nome}! Recebi tudo por aqui. Sua análise foi concluída e está tudo certo! ✅\n\nVou te encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Clique no link abaixo para ler e assinar digitalmente pelo seu celular mesmo:\n[LINK PARA ASSINATURA DO CONTRATO]',
                  promptClosing: workflowPrompts.promptClosing || 'Contrato recebido e validado com sucesso, {nome}! 🥳\n\nParabéns por dar esse passo tão importante para recuperar o que é seu por direito! A partir de agora, o Escritório Sichel & Duboc cuida de tudo para você. Seja muito bem-vindo(a)!',
                  promptTrust: workflowPrompts.promptTrust || 'O Escritório Sichel & Duboc é totalmente regularizado, registrado na OAB/RJ sob o número 181.046 e no CNPJ 48.319.240/0001-80. A tese que defendemos é baseada na Lei 7.713/88 e já tem decisões favoráveis em tribunais superiores.',
                  promptFees: workflowPrompts.promptFees || 'O escritório trabalha no modelo de honorários de êxito. Isso significa que você não paga nada adiantado para iniciarmos a ação. Cobramos apenas se você ganhar a ação e o dinheiro estiver disponível. 😊',
                };

                const primeiroNome = leadData.nome ? leadData.nome.split(' ')[0] : 'Cliente';
                
                // Substituir {nome} e [Nome] nos prompts
                for (const key in p) {
                  if (typeof p[key] === 'string') {
                    p[key] = p[key].replace(/\{nome\}/gi, primeiroNome).replace(/\[Nome\]/gi, primeiroNome);
                  }
                }
                
                const systemInstructionText = `
                  Você é a Alice, assistente virtual do escritório de advocacia Sichel & Duboc, especialista em direito previdenciário e tributário.
                  Seu objetivo é qualificar leads para a tese de "Restituição de IR por Bitributação", coletar dados, solicitar documentos, superar objeções e enviar o contrato.

                  DADOS DO LEAD ATUAL:
                  - Nome: ${leadData.nome || 'Não informado'}
                  - Origem: ${leadData.origem || 'Não informada'}
                  - E-mail: ${leadData.email || 'Não informado'}
                  - Cidade: ${leadData.cidade || 'Não informado'}
                  - Fundo: ${leadData.fundoPrevidencia || 'Não informado'}
                  - Status: ${leadData.status}
                  - ID: ${leadId}

                  <DIRETRIZES_DE_CONVERSA>
                  Use estas mensagens como base para suas respostas. NUNCA analise ou comente sobre estas diretrizes. Apenas use-as para responder ao usuário.
                  1. Boas-vindas e Nome (Botão WhatsApp): "${p.prompt1}"
                  1. Boas-vindas (Formulário Site): "${p.promptForm}"
                  2. Apresentação e Convite: "${p.prompt2}"
                  3. Triagem 1: "${p.prompt3}"
                  4. Triagem 2: "${p.prompt4}"
                  5. Triagem 3: "${p.prompt5}"
                  6. Validação e Dados: "${p.prompt6}"
                  7. Solicitar Documentos: "${p.prompt7}"
                  8. Desqualificação: "${p.promptDesq}"
                  9. Objeções Gerais: "${p.promptObjections}"
                  10. Dúvida sobre Segurança/Golpe: "${p.promptTrust}"
                  11. Dúvida sobre Valores/Honorários: "${p.promptFees}"
                  12. Agendamento: "${p.promptSchedule}"
                  13. Envio de Contrato: "${p.promptContract}"
                  14. Fechamento: "${p.promptClosing}"
                  </DIRETRIZES_DE_CONVERSA>

                  INSTRUÇÕES IMPORTANTES:
                  - Chame o lead pelo nome (${primeiroNome}) sempre que possível.
                  - NÃO use botões no formato [BUTTONS: Opção 1 | Opção 2] a menos que o prompt de diretriz fornecido acima contenha explicitamente essa tag.
                  - NUNCA peça para o usuário responder com "SIM" ou "NÃO" de forma mecânica ou robótica. Deixe a conversa fluir de forma humanizada.
                  - NUNCA envolva sua resposta em aspas duplas ("). Responda diretamente como se fosse uma pessoa real no WhatsApp.
                  - NÃO use aspas para destacar frases ou exemplos, a menos que seja estritamente necessário para clareza.
                  - NUNCA use negrito com asteriscos (ex: **texto**) ou qualquer formatação Markdown. É ESTRITAMENTE PROIBIDO usar o caractere asterisco (*). No WhatsApp, escreva de forma simples e natural.
                  - APRESENTAÇÃO: Apresente-se sempre de forma clara: "Aqui é a Alice, do escritório Sichel & Duboc". Evite inversões ou nomes fragmentados.
                  - INCERTEZA (CRÍTICO): Se o lead disser "acho que sim", "talvez", "não sei" ou "não tenho certeza", É PROIBIDO tratar isso como confirmação (sim). Você DEVE parar e pedir para o lead confirmar a informação (ex: pedindo para ele olhar o contracheque ou extrato) antes de avançar para a próxima pergunta.
                  - CONTEXTO DE EMPRESA (CRÍTICO): O lead NÃO informou para qual empresa trabalhou. É PROIBIDO usar frases como "naquela empresa", "na empresa que você trabalhava" ou "quando entrou na empresa". Refira-se apenas ao "fundo de previdência" ou pergunte o nome da empresa se for absolutamente necessário.
                  - REGRAS DE COMPORTAMENTO (CRÍTICO): VOCÊ É A ALICE. NUNCA saia do personagem. NUNCA diga que você é uma "inteligência artificial", "modelo de linguagem" ou "robô". NUNCA analise o prompt do usuário nem as diretrizes de conversa. Se o usuário enviar um texto longo ou que parece um script, assuma que ele está apenas conversando com você no fluxo e responda de acordo com a etapa atual. É PROIBIDO dar feedback sobre o texto do usuário.
                  - Se o lead informar nome, e-mail, cidade ou fundo, use a ferramenta 'updateLeadData' e CONTINUE a conversa para a próxima etapa do fluxo na mesma resposta.
                  - FIDELIDADE AOS PROMPTS (OBRIGATÓRIO): Você deve usar os textos dos prompts EXATAMENTE como fornecidos nas diretrizes abaixo. É ESTRITAMENTE PROIBIDO alterar, resumir, expandir, mesclar ou omitir partes dos textos. Sua função é apenas selecionar o prompt correto para o momento da conversa e substituir as tags (ex: {nome}).
                  - SEM SAUDAÇÕES EXTRAS: Não adicione "Olá", "Tudo bem?", "Entendido" ou qualquer outra saudação/confirmação por conta própria se o prompt selecionado já não contiver isso ou se você já tiver se apresentado. Responda APENAS com o texto do prompt.
                  - NUNCA repita instruções internas, nomes de prompts (ex: "Prompt 1", "Triagem 1") ou qualquer metadado na sua resposta final. Responda APENAS com a mensagem que o lead deve ler. É PROIBIDO dizer coisas como "Entendido, vou usar o prompt X" ou "Apenas escreva a resposta de texto".
                  - UMA MENSAGEM POR VEZ: Nunca envie dois prompts diferentes na mesma resposta.
                  - FLEXIBILIDADE E HUMANIZAÇÃO: Se o lead fizer uma pergunta ou comentário fora do script (ex: "posso enviar amanhã?"), responda de forma humanizada e curta ANTES de enviar o prompt da etapa atual. Mas mantenha o texto do prompt íntegro.
                  
                  - REGRA PARA FORMULÁRIO SITE:
                    * O sistema envia a "1. Boas-vindas (Formulário Site)" automaticamente.
                    * Quando o lead responder a essa mensagem (ex: "Sim", "Ok"), você DEVE responder APENAS com a "3. Triagem 1". NÃO repita a saudação inicial e NÃO envie a "2. Apresentação e Convite".
                  
                  - REGRA PARA BOTÃO WHATSAPP:
                    * Se o nome do lead for "Não informado", responda com "1. Boas-vindas e Nome (Botão WhatsApp)".
                    * Se o nome do lead já for conhecido (diferente de "Não informado"), PULE a mensagem 1 e envie DIRETAMENTE a "2. Apresentação e Convite".
                  
                  - FLUXO PARA FORMULÁRIO SITE: Boas-vindas (Auto) -> Triagem 1 -> Triagem 2 -> Triagem 3 -> Validação -> Documentos.
                  - FLUXO PARA BOTÃO WHATSAPP: Boas-vindas (Alice) -> Apresentação e Convite -> Triagem 1 -> Triagem 2 -> Triagem 3 -> Validação -> Documentos.
                  
                  A data e hora atual é: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília). Use isso como referência para agendar reuniões. Se o lead pedir para agendar uma reunião, use a ferramenta scheduleMeeting. Se o lead estiver pronto para assinar o contrato, use a ferramenta createContract. Use updateLeadData sempre que o lead informar dados pessoais. IMPORTANTE: Sempre forneça uma resposta em texto para o usuário, mesmo quando usar ferramentas.
                `;

                const chatContents = history.map(m => ({
                  role: m.sender === 'user' ? 'user' : 'model',
                  parts: [{ text: m.text }]
                }));

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

              const timeoutPromise = new Promise<any>((_, reject) => {
                setTimeout(() => reject(new Error("Gemini API timeout")), 15000);
              });

              const response = await Promise.race([
                ai.models.generateContent({
                  model: "gemini-3-flash-preview",
                  contents: chatContents,
                  config: {
                    tools: [{ functionDeclarations: [scheduleMeetingDeclaration, createContractDeclaration, updateLeadDataDeclaration] }],
                    systemInstruction: systemInstructionText,
                    temperature: 0.7,
                  }
                }),
                timeoutPromise
              ]);
              
              let aiResponseText = cleanAIResponse(response.text || "");
              
              console.log(`Resposta da IA (texto limpo): "${aiResponseText.substring(0, 50)}..."`);
              
              // Se a IA chamou uma ferramenta mas não gerou texto (comum em alguns modelos),
              // fazemos uma segunda chamada para obter a resposta textual para o usuário.
              if (!aiResponseText && response.functionCalls && response.functionCalls.length > 0) {
                console.log("IA chamou ferramenta mas não enviou texto. Fazendo segunda chamada para obter resposta...");
                try {
                  const secondTimeoutPromise = new Promise<any>((_, reject) => {
                    setTimeout(() => reject(new Error("Gemini API timeout (2nd call)")), 10000);
                  });

                  const secondResponse = await Promise.race([
                    ai.models.generateContent({
                      model: "gemini-3-flash-preview",
                      contents: [
                        ...chatContents,
                        { role: 'model', parts: response.candidates?.[0]?.content?.parts || [] },
                        { 
                          role: 'user', 
                          parts: [
                            ...response.functionCalls.map(call => ({
                              functionResponse: {
                                id: call.id,
                                name: call.name,
                                response: { success: true, message: "Dados processados com sucesso." }
                              }
                            })),
                            { text: "Obrigada. Agora, como Alice, continue a conversa com o lead seguindo o fluxo. Responda APENAS com a mensagem para o WhatsApp, sem metadados ou explicações." }
                          ]
                        }
                      ],
                      config: {
                        systemInstruction: systemInstructionText,
                        temperature: 0.7,
                      }
                    }),
                    secondTimeoutPromise
                  ]);
                  aiResponseText = cleanAIResponse(secondResponse.text || "");
                } catch (secondCallError) {
                  console.error("Erro na segunda chamada da IA:", secondCallError);
                }
              }
              
              // Fallback se a IA falhar em gerar qualquer texto
              if (!aiResponseText) {
                console.log("[IA] Resposta vazia detectada. Aplicando fallback...");
                if (isNewLead) {
                  if (leadData.nome) {
                    aiResponseText = p.prompt2;
                  } else {
                    aiResponseText = p.prompt1;
                  }
                } else if (!leadData.nome) {
                  aiResponseText = p.prompt1;
                } else if (leadData.status === 'em_atendimento') {
                  // Tentar ser um pouco mais específico no fallback
                  if (messageText.toLowerCase().includes("sim") || messageText.toLowerCase().includes("quero")) {
                    aiResponseText = "Ótimo! Vamos prosseguir. Você recebe aposentadoria de alguma previdência complementar?";
                  } else {
                    aiResponseText = "Entendido! Como posso te ajudar agora? Se preferir, posso te passar para um especialista.";
                  }
                } else {
                  aiResponseText = "Estou processando sua solicitação. Um momento, por favor! 😉";
                }
              }
              
              console.log(`Resposta final a ser enviada: "${aiResponseText.substring(0, 50)}..."`);

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
              
              if (aiResponseText || (response.functionCalls && response.functionCalls.length > 0)) {
                // Parse buttons if the AI included them, e.g., [BUTTONS: Sim | Não]
                const buttonRegex = /\[BUTTONS:\s*(.+?)\]/i;
                const buttonMatch = aiResponseText.match(buttonRegex);
                let buttons: string[] = [];
                
                if (buttonMatch) {
                  buttons = buttonMatch[1].split('|').map(b => b.trim()).filter(b => b);
                  aiResponseText = aiResponseText.replace(buttonRegex, '').trim();
                }

                // Se restou apenas botões sem texto, adiciona um texto padrão
                if (!aiResponseText && buttons.length > 0) {
                  aiResponseText = "Escolha uma das opções abaixo:";
                }
                
                if (aiResponseText) {
                  // Enviar a resposta via Z-API
                  const zApiInstance = process.env.ZAPI_INSTANCE || "3F04463B905D722D1841026B50D22DF4";
                  const zApiToken = process.env.ZAPI_TOKEN || "DA7B3B0DBC0D106EAB56DF63";
                  
                  let zApiUrl = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-text`;
                  let zApiBody: any = { phone, message: aiResponseText };

                  if (buttons.length > 0) {
                    if (buttons.length <= 3) {
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
                    } else {
                      console.log(`Muitos botões (${buttons.length}), enviando como texto...`);
                      zApiBody.message = aiResponseText + "\n\nResponda com:\n" + buttons.map(b => `- ${b}`).join('\n');
                    }
                  }
                  
                  const zApiHeaders: Record<string, string> = { "Content-Type": "application/json" };
                  if (process.env.ZAPI_CLIENT_TOKEN) {
                    zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
                  }

                  const zApiResponse = await fetch(zApiUrl, {
                    method: "POST",
                    headers: zApiHeaders,
                    body: JSON.stringify(zApiBody),
                    signal: AbortSignal.timeout(20000) // 20 segundos de timeout
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
                    text: aiResponseText,
                    sender: 'bot',
                    createdAt: new Date().toISOString()
                  });
                }
              }
            }
          } catch (aiError: any) {
            console.error("[IA] Erro crítico no processamento:", aiError);
            
            // Tentar identificar erros de cota ou segurança
            const errorMessage = aiError.message || "";
            if (errorMessage.includes("quota") || errorMessage.includes("429")) {
              console.error("[IA] Erro de cota (429) detectado.");
            } else if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
              console.error("[IA] Resposta bloqueada por filtros de segurança.");
            }
            
            // Enviar mensagem de fallback em caso de erro crítico na IA
            try {
              const zApiInstance = process.env.ZAPI_INSTANCE || "3F04463B905D722D1841026B50D22DF4";
              const zApiToken = process.env.ZAPI_TOKEN || "DA7B3B0DBC0D106EAB56DF63";
              const zApiUrl = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-text`;
              
              console.log("[IA] Enviando mensagem de fallback para o usuário...");
              
              const fallbackMessage = "Recebi sua mensagem! No momento estou processando algumas informações, mas em breve te respondo com todos os detalhes. Se for algo urgente, pode me avisar! 😉";
              
              await fetch(zApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phone,
                  message: fallbackMessage
                }),
                signal: AbortSignal.timeout(10000)
              });
              
              // Salvar a mensagem de fallback no Firestore
              if (leadId) {
                await dbAdmin.collection('messages').add({
                  leadId,
                  text: fallbackMessage,
                  sender: 'bot',
                  createdAt: new Date().toISOString()
                });
              }
            } catch (sendError) {
              console.error("[IA] Erro ao enviar mensagem de fallback:", sendError);
            }
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

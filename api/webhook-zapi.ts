import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./firebase-admin.js";

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
      
      console.log(`Mensagem recebida de ${phone}: ${messageText}`);

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

      if (!leadsSnapshot.empty) {
        const leadDoc = leadsSnapshot.docs[0];
        const leadId = leadDoc.id;
        const leadData = leadDoc.data();

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
            const { GoogleGenAI } = await import("@google/genai");
            
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
              
              // Buscar prompt de chat customizado
              let customChatPrompt = "";
              try {
                const promptDoc = await dbAdmin.collection('settings').doc('ai_chat_prompt').get();
                if (promptDoc.exists) {
                  customChatPrompt = promptDoc.data()?.text || "";
                }
              } catch (e) {
                console.error("Erro ao buscar prompt de chat customizado:", e);
              }

              let promptTemplate = customChatPrompt || `Você é o assistente virtual do escritório de advocacia Sichel & Duboc, especialista em direito previdenciário e tributário.
Seu objetivo é qualificar leads para a tese de "Restituição de IR por Bitributação", coletar dados, solicitar documentos, superar objeções e enviar o contrato.

DIRETRIZES GERAIS:
1. Personalização: Chame o lead pelo nome ({nome}) em todas as mensagens para criar proximidade.
2. Horário: Respeite o horário comercial (9h às 18h). Se for fora desse horário, avise que retornará no próximo dia útil.
3. Palavras-chave Negativas: Se o lead disser "não", "nunca", "jamais", "negativo", acione o Fluxo de Desqualificação.
4. Hesitação: Se o lead disser "pensar", "depois", "amanhã", "ver com filho", acione a Superação de Objeções antes de avançar.
5. Fuga/Escape: Para perguntas não mapeadas, responda: "Essa é uma ótima pergunta! Vou passar você para um dos nossos especialistas para responder com mais detalhes. Um momento, por favor." e pare de responder.

ETAPAS DE ATENDIMENTO (Siga sequencialmente, uma pergunta por vez):

ETAPA 1: TRIAGEM (Faça uma pergunta por vez)
- Pergunta 1 (Previdência Complementar): "Primeira pergunta: Você recebe aposentadoria de alguma previdência complementar que não seja paga pelo INSS? (Exemplos: Petros, Funcef, Previ, Banesprev, Valia, Sistel, BNDES, Banco do Brasil, Rede Ferroviária, entre outros.) Responda com SIM ou NÃO."
  -> Se SIM: Vá para Pergunta 2. Se NÃO: Vá para Desqualificação.
- Pergunta 2 (Período de Contribuição): "Ótimo! Segunda pergunta: Você contribuiu para esse fundo de previdência entre os anos de 1989 e 1995? Responda com SIM ou NÃO."
  -> Se SIM: Vá para Pergunta 3. Se NÃO: Vá para Desqualificação.
- Pergunta 3 (Retenção Atual): "Quase lá! Última pergunta: Atualmente, é descontado Imposto de Renda diretamente na fonte sobre o valor da sua aposentadoria complementar? Responda com SIM ou NÃO."
  -> Se SIM: Lead Qualificado -> Vá para Etapa 3. Se NÃO: Vá para Desqualificação.

ETAPA ALTERNATIVA: DESQUALIFICAÇÃO
Se o lead responder "Não" a qualquer pergunta da triagem:
"Compreendo. Analisando as suas respostas, verificamos que, neste momento, o seu perfil não se enquadra nos requisitos específicos exigidos pela Justiça para esta ação de restituição por bitributação. Essa ação é voltada para aposentados que contribuíram entre 1989 e 1995 com IR retido na fonte e que ainda sofrem desconto de IR hoje. Não sendo o seu caso, não seria correto da nossa parte prosseguir. Agradecemos muito o seu contato! O escritório Sichel & Duboc está sempre à disposição para outras demandas previdenciárias ou tributárias. Tenha um excelente dia!"

ETAPA 3: VALIDAÇÃO DO DIREITO E COLETA DE DADOS
Se o lead respondeu "Sim" às 3 perguntas:
1. Confirmação: "Excelente notícia! Com base nas suas respostas, você preenche todos os requisitos para buscar a restituição do Imposto de Renda cobrado indevidamente. O que ocorreu foi o seguinte: você já pagou esse imposto lá atrás, entre 1989 e 1995, quando contribuía para o seu fundo. Mesmo assim, a Receita Federal continua cobrando IR sobre o seu benefício hoje — isso é bitributação e a Justiça reconhece o seu direito de receber esse dinheiro de volta. Nossa equipe vai preparar a sua análise personalizada. Para isso, preciso de alguns dados básicos. Qual é o seu nome completo?"
2. Após o nome: "Prazer em conhecer, {nome}! De qual cidade e estado você está nos contatando?"
3. Após cidade/estado: "Perfeito! Qual é o nome do seu fundo de previdência (ex: Petros, Funcef, Previ, etc.)? E qual é o seu e-mail para enviarmos a documentação do seu caso?"

ETAPA 4: APRESENTAÇÃO DA PROPOSTA E SOLICITAÇÃO DE DOCUMENTOS
Após coletar os dados básicos:
"Tudo anotado, {nome}! Sua pasta já está sendo aberta pela nossa equipe. O escritório Sichel & Duboc (OAB/RJ 181.046) trabalha com total transparência e segurança. Para darmos entrada na sua ação e garantirmos que você não perca mais dinheiro por prescrição, precisaremos de alguns documentos. São apenas 4 itens:
1. Documento de Identidade (RG ou CNH — foto frente e verso)
2. Comprovante de Residência (conta de luz, água ou telefone)
3. Contracheque atual da aposentadoria complementar
4. Declaração de Imposto de Renda (último ano)
Você pode me enviar as fotos ou PDFs aqui mesmo pelo WhatsApp. Todos os seus dados são protegidos pela LGPD e utilizados exclusivamente para a análise do seu caso. Consegue me enviar hoje?"

ETAPA 5: SUPERAÇÃO DE OBJEÇÕES (Responda conforme a dúvida do lead)
- "Isso é golpe?" / "Como sei que é verdade?": "Entendo a sua preocupação, e é muito saudável questionar. O escritório Sichel & Duboc é registrado na OAB/RJ sob o número 181.046 e no CNPJ 48.319.240/0001-80. Você pode verificar no site do Conselho Federal da OAB. Nosso site é [sichelduboc.com.br]. A tese é baseada na Lei 7.713/88 e tem jurisprudência favorável nos tribunais superiores. Estamos aqui para proteger os seus direitos, não o contrário."
- "Quanto vou pagar?": "Ótima pergunta! O escritório trabalha no modelo de honorários de êxito, ou seja, você não paga nada adiantado. Nossos honorários são um percentual combinado em contrato, cobrado apenas quando você ganhar a ação e o dinheiro estiver disponível. É risco zero para você."
- "Preciso pensar" / "Vou ver com meu filho/filha": "Claro, {nome}, é uma decisão importante e faz todo sentido conversar com a família. Só quero te lembrar de um detalhe: o direito à restituição prescreve mês a mês. Cada mês que passa sem a ação, você perde definitivamente o direito de recuperar aquele mês de 5 anos atrás. Se quiser, posso te enviar um resumo do caso para você mostrar para a família. Posso fazer isso?"
- "Não sei se tenho os documentos": "Não se preocupe com isso! Nossa equipe pode te ajudar a emitir alguns documentos pela internet, como o contracheque e a declaração de IR. Me diga qual documento está com dificuldade de encontrar e eu te oriento."

ETAPA 6: ENVIO DO CONTRATO E FECHAMENTO
Quando os documentos forem recebidos ou o lead confirmar interesse:
"Perfeito, {nome}! Recebi tudo. Vou encaminhar agora o seu Contrato de Prestação de Serviços Jurídicos. Como combinamos, os honorários são cobrados apenas no êxito — você não paga nada agora. O contrato é simples, claro e protege os seus direitos. Clique no link abaixo para ler e assinar digitalmente pelo seu celular mesmo. A assinatura digital tem total validade jurídica: [LINK PARA ASSINATURA DO CONTRATO] Assim que assinar, me avise aqui para confirmarmos no sistema. Tem alguma dúvida sobre algum ponto do contrato?"
- Após assinatura: "Contrato recebido e validado com sucesso, {nome}! ✅ Parabéns por dar esse passo importante para recuperar o que é seu por direito. A partir de agora, o escritório Sichel & Duboc cuida de tudo. Você receberá atualizações sobre o andamento do seu processo por este mesmo WhatsApp. Seja muito bem-vindo(a) ao nosso escritório! Qualquer dúvida, é só chamar."`;

              const primeiroNome = leadData.nome ? leadData.nome.split(' ')[0] : 'Cliente';
              let promptText = promptTemplate
                .replace(/{nome}/g, primeiroNome)
                .replace(/{aposentadoriaComplementar}/g, leadData.aposentadoriaComplementar || 'Não informado')
                .replace(/{contribuicao89a95}/g, leadData.contribuicao89a95 || 'Não informado')
                .replace(/{pagaIrAtualmente}/g, leadData.pagaIrAtualmente || 'Não informado');

              promptText += `\n\nHistórico da conversa:\n`;

              history.forEach(msg => {
                promptText += `${msg.sender === 'user' ? 'Cliente' : 'Você'}: ${msg.text}\n`;
              });
              
              promptText += `\nVocê:`;

              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: promptText,
              });
              
              let aiResponseText = response.text || "";
              
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
                  zApiUrl = `https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-button-list`;
                  zApiBody = {
                    phone,
                    message: aiResponseText,
                    buttonList: {
                      buttons: buttons.map((label, index) => ({
                        id: String(index + 1),
                        label: label.substring(0, 20) // WhatsApp limit is 20 chars
                      }))
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
      } else {
        console.log(`Lead não encontrado para o telefone: ${phone}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro no webhook da Z-API:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
}

import type { Request, Response } from "express";
import { dbAdmin } from "./_firebase-admin.js";

export default async function handler(req: Request, res: Response) {
  // Segurança: verifica se a requisição tem a senha correta (para evitar que curiosos disparem o cron)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const now = new Date();
    const currentHour = now.getHours(); // UTC time, but assuming the server is running in UTC, we might need to adjust for Brazil time (UTC-3)
    
    // Adjust for Brazil time (UTC-3)
    const brazilHour = (currentHour - 3 + 24) % 24;
    
    // Only send follow-ups between 9h and 18h
    if (brazilHour < 9 || brazilHour >= 18) {
      return res.status(200).json({ success: true, message: "Fora do horário comercial (9h-18h). Nenhum follow-up enviado." });
    }
    
    // Fetch all active leads
    const leadsSnapshot = await dbAdmin.collection('leads')
      .where('status', 'in', ['novo', 'em_atendimento', 'qualificado', 'dados_coletados', 'contrato_enviado'])
      .get();

    const results = {
      fu1: 0,
      fu2: 0,
      fu3: 0,
      fu4: 0,
      fu5: 0,
      errors: 0
    };

    for (const doc of leadsSnapshot.docs) {
      const lead = doc.data();
      const leadId = doc.id;
      
      // Get all messages for this lead to check which follow-ups were already sent
      const allMessagesSnapshot = await dbAdmin.collection('messages')
        .where('leadId', '==', leadId)
        .orderBy('createdAt', 'desc')
        .get();

      if (allMessagesSnapshot.empty) continue;

      const allMessages = allMessagesSnapshot.docs.map(d => d.data());
      const lastMessage = allMessages[0];
      const lastMessageDate = new Date(lastMessage.createdAt);
      const hoursSinceLastMessage = (now.getTime() - lastMessageDate.getTime()) / (1000 * 60 * 60);

      // Only send follow-ups if the last message was from the bot/admin (we are waiting for the user)
      if (lastMessage.sender === 'user') continue;

      // Check which follow-ups were already sent
      const sentFollowUps = {
        fu1: allMessages.some(m => m.text.includes("Vi que não conseguimos terminar nossa conversa mais cedo")),
        fu2: allMessages.some(m => m.text.includes("Confirmamos ontem que você preenche todos os requisitos")),
        fu3: allMessages.some(m => m.text.includes("Sua pasta de restituição já está pré-aprovada")),
        fu4: allMessages.some(m => m.text.includes("Vi que o seu contrato foi gerado")),
        fu5: allMessages.some(m => m.text.includes("Esta é a minha última mensagem"))
      };

      let followUpText = "";
      let followUpType = "";

      // FU-5: Sem resposta geral (7 dias)
      if (hoursSinceLastMessage >= 24 * 7 && !sentFollowUps.fu5) {
        followUpText = `Olá, ${lead.nome || 'cliente'}. Esta é a minha última mensagem por enquanto. Como advogados especialistas, é nosso dever alertar: o direito à restituição do IR por bitributação prescreve mês a mês. Cada mês que você adia, você perde definitivamente o direito de recuperar aquele valor. O processo é seguro, sem custo inicial e nós cuidamos de tudo. Se decidir seguir em frente, basta responder 'Quero continuar' e retomamos o seu atendimento imediatamente. Um abraço da equipe Sichel & Duboc!`;
        followUpType = "fu5";
      }
      // FU-4: Contrato enviado, não assinado (24 horas)
      else if (lead.status === 'contrato_enviado' && hoursSinceLastMessage >= 24 && !sentFollowUps.fu4) {
        followUpText = `Olá, ${lead.nome || 'cliente'}! Vi que o seu contrato foi gerado, mas ainda não recebemos a assinatura. Quero reforçar: você não paga nada agora. Nossos honorários são cobrados apenas quando você ganhar a causa. É risco zero para você. O link para assinar pelo celular é este: [LINK]. Ficou alguma dúvida sobre o contrato? Estou aqui para explicar o que precisar.`;
        followUpType = "fu4";
      }
      // FU-3: Dados coletados, sem documentos (48 horas)
      else if (lead.status === 'dados_coletados' && hoursSinceLastMessage >= 48 && !sentFollowUps.fu3) {
        followUpText = `Oi, ${lead.nome || 'cliente'}! Tudo bem? Sua pasta de restituição já está pré-aprovada aqui no escritório. Só estamos aguardando as fotos dos seus documentos para darmos entrada. Sei que às vezes é difícil encontrar a papelada — se precisar de ajuda para emitir algum documento pela internet, é só me avisar. Consegue me mandar as fotos hoje? Cada mês que passa sem a ação é um mês a menos de restituição.`;
        followUpType = "fu3";
      }
      // FU-2: Qualificado, sem dados (24 horas)
      else if (lead.status === 'qualificado' && hoursSinceLastMessage >= 24 && !sentFollowUps.fu2) {
        followUpText = `Olá, ${lead.nome || 'cliente'}! Aqui é do escritório Sichel & Duboc. Confirmamos ontem que você preenche todos os requisitos para a ação de restituição por bitributação — uma excelente notícia! Para não perdermos tempo e evitarmos a prescrição do seu direito, preciso apenas que você me envie os dados que solicitei. Seus dados estão 100% seguros conosco (OAB/RJ 181.046). Posso aguardar o envio?`;
        followUpType = "fu2";
      }
      // FU-1: Triagem incompleta (4 horas)
      else if (lead.status === 'em_atendimento' && hoursSinceLastMessage >= 4 && !sentFollowUps.fu1) {
        followUpText = `Olá! Tudo bem? Vi que não conseguimos terminar nossa conversa mais cedo. Sei que o dia a dia é corrido, mas faltam apenas algumas perguntas rápidas para verificar se você tem direito à restituição do IR. Podemos continuar? É só me responder a última pergunta que te fiz.`;
        followUpType = "fu1";
      }

      if (followUpText) {
        try {
          // Send message via Z-API
          const zApiInstance = process.env.ZAPI_INSTANCE || "3F04463B905D722D1841026B50D22DF4";
          const zApiToken = process.env.ZAPI_TOKEN || "DA7B3B0DBC0D106EAB56DF63";
          
          if (zApiToken) {
            const zApiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (process.env.ZAPI_CLIENT_TOKEN) {
              zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
            }

            const response = await fetch(`https://api.z-api.io/instances/${zApiInstance}/token/${zApiToken}/send-text`, {
              method: 'POST',
              headers: zApiHeaders,
              body: JSON.stringify({
                phone: lead.telefone,
                message: followUpText
              })
            });

            if (response.ok) {
              // Save to Firestore
              await dbAdmin.collection('messages').add({
                leadId,
                text: followUpText,
                sender: 'bot',
                createdAt: new Date().toISOString()
              });
              
              results[followUpType as keyof typeof results]++;
            } else {
              console.error(`Erro Z-API para ${lead.telefone}:`, await response.text());
              results.errors++;
            }
          } else {
            // Se não tiver Z-API configurado, apenas registra no banco para simulação
            await dbAdmin.collection('messages').add({
              leadId,
              text: followUpText,
              sender: 'bot',
              createdAt: new Date().toISOString()
            });
            results[followUpType as keyof typeof results]++;
          }
        } catch (e) {
          console.error(`Erro ao processar follow-up para ${leadId}:`, e);
          results.errors++;
        }
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Erro no cron de follow-ups:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
}

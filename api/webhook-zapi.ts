import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./firebase-admin";

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;
    
    // Z-API sends events like 'onMessage'
    // Format: { isGroup: false, phone: '5511999999999', text: { message: 'Hello' }, ... }
    
    if (data && data.phone && data.text && data.text.message && !data.isGroup) {
      const phone = data.phone;
      const messageText = data.text.message;
      
      console.log(`Mensagem recebida de ${phone}: ${messageText}`);

      // 1. Encontrar o Lead pelo telefone
      const leadsSnapshot = await dbAdmin.collection('leads')
        .where('telefone', '==', phone)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!leadsSnapshot.empty) {
        const leadDoc = leadsSnapshot.docs[0];
        const leadId = leadDoc.id;
        const leadData = leadDoc.data();

        // 2. Salvar a mensagem recebida
        await dbAdmin.collection('messages').add({
          leadId,
          text: messageText,
          sender: 'user',
          createdAt: new Date().toISOString()
        });

        // 3. Atualizar o status do lead se for 'novo'
        if (leadData.status === 'novo') {
          await leadDoc.ref.update({
            status: 'em_atendimento',
            updatedAt: new Date().toISOString()
          });
          leadData.status = 'em_atendimento';
        }
        
        // 4. Lógica do Chatbot (IA)
        if (leadData.status === 'em_atendimento') {
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
                .limit(10)
                .get();
                
              const history = historySnapshot.docs.map(d => d.data()).reverse();
              
              let prompt = `Você é um assistente virtual de um escritório de advocacia previdenciária (Sichel & Duboc).
O nome do cliente é ${leadData.nome}.
Histórico da conversa:\n`;

              history.forEach(msg => {
                prompt += `${msg.sender === 'user' ? 'Cliente' : 'Você'}: ${msg.text}\n`;
              });
              
              prompt += `\nResponda à última mensagem do cliente de forma educada, profissional e concisa. 
Seu objetivo é entender o problema previdenciário dele e agendar uma consulta com um advogado.
Não invente informações jurídicas complexas, apenas colete dados e seja acolhedor.`;

              const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
              });
              
              const aiResponseText = response.text;
              
              if (aiResponseText) {
                // Enviar a resposta via Z-API
                const zApiUrl = "https://api.z-api.io/instances/3F04463B905D722D1841026B50D22DF4/token/DA7B3B0DBC0D106EAB56DF63/send-text";
                const zApiHeaders: Record<string, string> = { "Content-Type": "application/json" };
                if (process.env.ZAPI_CLIENT_TOKEN) {
                  zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
                }

                await fetch(zApiUrl, {
                  method: "POST",
                  headers: zApiHeaders,
                  body: JSON.stringify({ phone, message: aiResponseText })
                });
                
                // Salvar a resposta da IA no Firestore
                await dbAdmin.collection('messages').add({
                  leadId,
                  text: aiResponseText,
                  sender: 'bot',
                  createdAt: new Date().toISOString()
                });
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

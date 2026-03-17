import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./firebase-admin.js";

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { leadId, text } = req.body;

    if (!leadId || !text) {
      return res.status(400).json({ error: "Missing leadId or text" });
    }

    // 1. Obter o telefone do lead
    const leadDoc = await dbAdmin.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const leadData = leadDoc.data();
    const phone = leadData?.telefone;

    if (!phone) {
      return res.status(400).json({ error: "Lead has no phone number" });
    }

    // 2. Enviar via Z-API
    const zApiUrl = "https://api.z-api.io/instances/3F04463B905D722D1841026B50D22DF4/token/DA7B3B0DBC0D106EAB56DF63/send-text";
    const zApiHeaders: Record<string, string> = { 
      "Content-Type": "application/json" 
    };
    
    if (process.env.ZAPI_CLIENT_TOKEN) {
      zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
    }

    const zApiResponse = await fetch(zApiUrl, {
      method: "POST",
      headers: zApiHeaders,
      body: JSON.stringify({ phone, message: text })
    });
    
    const zApiText = await zApiResponse.text();
    
    if (!zApiResponse.ok) {
      console.error("Z-API respondeu com erro ao enviar mensagem manual:", zApiResponse.status, zApiText);
      return res.status(500).json({ error: `Z-API Error: ${zApiText}` });
    }

    // 3. Salvar a mensagem no Firestore
    await dbAdmin.collection('messages').add({
      leadId,
      text,
      sender: 'admin',
      createdAt: new Date().toISOString()
    });

    // 4. Desativar a IA para este lead (Humano assumiu)
    await dbAdmin.collection('leads').doc(leadId).update({
      aiEnabled: false,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar mensagem manual:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
}

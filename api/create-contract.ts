import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./_firebase-admin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { leadId, name, email } = req.body;

  if (!leadId || !name || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const apiToken = process.env.ZAPSIGN_API_KEY;
    const modelId = process.env.ZAPSIGN_MODEL_ID;

    if (!apiToken || !modelId) {
      console.error("ZapSign API Key or Model ID not configured");
      return res.status(500).json({ error: "ZapSign not configured" });
    }

    // Create document from model
    const response = await fetch(`https://api.zapsign.com.br/api/v1/models/${modelId}/create-doc/?api_token=${apiToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrato - ${name}`,
        signer_name: name,
        signer_email: email,
        external_id: leadId,
        // You can add more fields if your model has variables
        // template_data: [{ variable: "NOME_CLIENTE", value: name }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error from ZapSign:", data);
      return res.status(500).json({ error: "Error creating contract in ZapSign", details: data });
    }

    const signUrl = data.signers?.[0]?.sign_url;
    const docToken = data.token;

    if (!signUrl) {
      return res.status(500).json({ error: "Sign URL not received from ZapSign" });
    }

    // Update lead with contract info
    await dbAdmin.collection("leads").doc(leadId).update({
      contractToken: docToken,
      contractUrl: signUrl,
      contractStatus: "sent",
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, signUrl, docToken });
  } catch (error) {
    console.error("Error in create-contract:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

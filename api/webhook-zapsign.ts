import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dbAdmin } from "./_firebase-admin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;
    console.log("ZapSign Webhook received:", JSON.stringify(data));

    // ZapSign sends event_type like 'doc_signed'
    if (data.event_type === "doc_signed") {
      const docToken = data.token;
      
      if (!docToken) {
        return res.status(400).json({ error: "Missing document token" });
      }

      // Find lead by contractToken
      const leadsSnapshot = await dbAdmin.collection('leads')
        .where('contractToken', '==', docToken)
        .limit(1)
        .get();

      if (!leadsSnapshot.empty) {
        const leadDoc = leadsSnapshot.docs[0];
        await leadDoc.ref.update({
          contractStatus: "signed",
          status: "fechado",
          updatedAt: new Date().toISOString()
        });
        
        // Log a message about the signature
        await dbAdmin.collection('messages').add({
          leadId: leadDoc.id,
          text: "✅ O cliente assinou o contrato digital via ZapSign!",
          sender: 'system',
          createdAt: new Date().toISOString()
        });

        console.log(`Lead ${leadDoc.id} updated to signed status.`);
      } else {
        console.log(`No lead found for contract token: ${docToken}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in ZapSign webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

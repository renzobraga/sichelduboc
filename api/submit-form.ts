import nodemailer from "nodemailer";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { dbAdmin } from "./firebase-admin";

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  // Allow CORS for local development if needed, though Vercel handles it via vercel.json usually
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nome, telefone, email, cidade, estado, aposentadoriaComplementar, contribuicao89a95, pagaIrAtualmente } = req.body;

  // Basic validation
  if (!nome || !telefone || !email) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }

  try {
    // --- 0. SALVAR LEAD NO BANCO DE DADOS (FIRESTORE) ---
    let leadId = "";
    let formattedPhone = telefone.replace(/\D/g, "");
    if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    try {
      const leadRef = dbAdmin.collection('leads').doc();
      leadId = leadRef.id;
      
      await leadRef.set({
        nome,
        telefone: formattedPhone,
        email: email || "",
        cidade: cidade || "",
        estado: estado || "",
        aposentadoriaComplementar: aposentadoriaComplementar || "",
        contribuicao89a95: contribuicao89a95 || "",
        pagaIrAtualmente: pagaIrAtualmente || "",
        status: "novo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`Lead salvo no Firestore com ID: ${leadId}`);
    } catch (dbError) {
      console.error("Erro ao salvar lead no Firestore:", dbError);
      // Continuamos o fluxo mesmo se o banco falhar
    }

    let emailEnviado = false;
    let erroEmail: any = null;
    
    // --- 1. TENTATIVA DE ENVIO DE E-MAIL ---
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Credenciais de e-mail (EMAIL_USER/EMAIL_PASS) não configuradas.");
      }
      
      const port = parseInt(process.env.EMAIL_PORT || "465");
      const isSecure = port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.hostinger.com",
        port: port,
        secure: isSecure, 
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false }
      });

      const mailOptions = {
        from: `"Sichel & Duboc Leads" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        subject: `Novo Lead: ${nome} - Restituição IR`,
        text: `
          Novo formulário recebido:

          Nome: ${nome}
          Telefone: ${telefone}
          Email: ${email}
          Cidade/Estado: ${cidade} / ${estado}

          Respostas de Triagem:
          - Aposentadoria Complementar: ${aposentadoriaComplementar}
          - Contribuição 89-95: ${contribuicao89a95}
          - Paga IR Atualmente: ${pagaIrAtualmente}
        `,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #38383a; border-bottom: 2px solid #dcb366; padding-bottom: 10px;">Novo Lead Recebido</h2>
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>Telefone:</strong> ${telefone}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Cidade/Estado:</strong> ${cidade} / ${estado}</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3 style="margin-top: 0; color: #38383a;">Triagem Inicial:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Aposentadoria Complementar:</strong> ${aposentadoriaComplementar}</li>
                <li><strong>Contribuição 89-95:</strong> ${contribuicao89a95}</li>
                <li><strong>Paga IR Atualmente:</strong> ${pagaIrAtualmente}</li>
              </ul>
            </div>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
              Este é um e-mail automático enviado pelo seu site.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      emailEnviado = true;
      console.log("E-mail enviado com sucesso para:", mailOptions.to);
    } catch (emailError: any) {
      console.error("Erro ao enviar e-mail:", emailError);
      erroEmail = emailError.message || String(emailError);
    }

    // --- 2. INTEGRAÇÃO Z-API E GEMINI IA ---
    let whatsappEnviado = false;
    let erroWhatsapp: any = null;
    let erroIA: any = null;
    
    try {
      let formattedPhone = telefone.replace(/\D/g, "");
      if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }

      let mensagemWhatsApp = "";
      try {
        // Fallback to empty string if undefined to avoid passing undefined directly
        let apiKey = process.env.CHAVE_IA_GEMINI || process.env.GEMINI_API_KEY || "";
        apiKey = apiKey.replace(/['"]/g, '').trim(); // Remove aspas acidentais e espaços
        
        if (!apiKey || apiKey === "AI Studio Free Tier") {
          throw new Error("Chave da IA não configurada ou inválida.");
        }
        
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const prompt = `Você é um assistente do escritório Sichel & Duboc. Lead: ${nome}. Aposentadoria: ${aposentadoriaComplementar}. Contribuiu 89-95: ${contribuicao89a95}. Paga IR: ${pagaIrAtualmente}. Crie uma mensagem curta de WhatsApp agradecendo, dizendo se é promissor e fazendo uma pergunta aberta. Assine Equipe Sichel & Duboc.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        mensagemWhatsApp = response.text || "Olá! Recebemos seu contato no site da Sichel & Duboc. Um de nossos advogados falará com você em breve!";
      } catch (aiError: any) {
        console.error("Erro na geração de IA, usando mensagem padrão:", aiError);
        erroIA = aiError.message || String(aiError);
        mensagemWhatsApp = `Olá, ${nome}! Recebemos seu contato no site da Sichel & Duboc. Um de nossos especialistas vai analisar seu caso e entrará em contato. Qual o melhor horário para falarmos?`;
      }

      const zApiUrl = "https://api.z-api.io/instances/3F04463B905D722D1841026B50D22DF4/token/DA7B3B0DBC0D106EAB56DF63/send-text";
      
      const zApiHeaders: Record<string, string> = { 
        "Content-Type": "application/json" 
      };
      
      // Adiciona o Client-Token se estiver configurado nas variáveis de ambiente
      if (process.env.ZAPI_CLIENT_TOKEN) {
        zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
      }

      const zApiResponse = await fetch(zApiUrl, {
        method: "POST",
        headers: zApiHeaders,
        body: JSON.stringify({ phone: formattedPhone, message: mensagemWhatsApp })
      });
      
      const zApiText = await zApiResponse.text();
      
      if (!zApiResponse.ok) {
        console.error("Z-API respondeu com erro:", zApiResponse.status, zApiText);
        erroWhatsapp = `Z-API Status ${zApiResponse.status}: ${zApiText}`;
      } else {
        console.log("Mensagem de WhatsApp enviada com sucesso para:", formattedPhone, "Resposta Z-API:", zApiText);
        whatsappEnviado = true;
        
        // Salvar a mensagem no banco de dados
        if (leadId) {
          try {
            await dbAdmin.collection('messages').add({
              leadId,
              text: mensagemWhatsApp,
              sender: 'bot',
              createdAt: new Date().toISOString()
            });
          } catch (msgError) {
            console.error("Erro ao salvar mensagem no Firestore:", msgError);
          }
        }
      }
    } catch (whatsappError: any) {
      console.error("Erro ao enviar WhatsApp via Z-API:", whatsappError);
      erroWhatsapp = whatsappError.message || String(whatsappError);
    }

    if (!emailEnviado && !whatsappEnviado) {
      return res.status(500).json({ 
        error: "Falha ao enviar e-mail e WhatsApp.",
        detalhes: {
          email: erroEmail,
          whatsapp: erroWhatsapp,
          ia: erroIA
        }
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Processado com sucesso!",
      avisos: {
        email: emailEnviado ? "Enviado" : erroEmail,
        whatsapp: whatsappEnviado ? "Enviado" : erroWhatsapp,
        ia: erroIA ? erroIA : "Sucesso"
      }
    });
  } catch (error) {
    console.error("Erro geral no servidor:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
}

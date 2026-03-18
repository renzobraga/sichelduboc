import nodemailer from "nodemailer";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase-client.js";
import { collection, doc, setDoc, addDoc, getDoc } from "firebase/firestore";

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
    // Gera o ID do lead sincronamente
    const leadsCollection = collection(db, 'leads');
    const leadRef = doc(leadsCollection);
    const leadId = leadRef.id;
    
    let formattedPhone = telefone.replace(/\D/g, "");
    if (formattedPhone.length >= 10 && !formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    // TAREFA 1: Salvar no Banco de Dados
    const dbPromise = setDoc(leadRef, {
      nome,
      telefone: formattedPhone,
      email: email || "",
      cidade: cidade || "",
      estado: estado || "",
      aposentadoriaComplementar: aposentadoriaComplementar || "",
      contribuicao89a95: contribuicao89a95 || "",
      pagaIrAtualmente: pagaIrAtualmente || "",
      status: "novo",
      aiEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).then(() => {
      console.log(`Lead salvo no Firestore com ID: ${leadId}`);
      return true;
    }).catch(e => {
      console.error("Erro ao salvar lead no Firestore:", e);
      return false;
    });

    // TAREFA 2: Enviar E-mail
    const emailPromise = (async () => {
      try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          throw new Error("Credenciais de e-mail não configuradas.");
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
          tls: { rejectUnauthorized: false },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        });

        const mailOptions = {
          from: `"Sichel & Duboc Leads" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_TO || process.env.EMAIL_USER,
          subject: `Novo Lead: ${nome} - Restituição IR`,
          text: `Novo formulário recebido:\nNome: ${nome}\nTelefone: ${telefone}\nEmail: ${email}\nCidade/Estado: ${cidade} / ${estado}\n\nTriagem:\n- Aposentadoria Complementar: ${aposentadoriaComplementar}\n- Contribuição 89-95: ${contribuicao89a95}\n- Paga IR Atualmente: ${pagaIrAtualmente}`,
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
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log("E-mail enviado com sucesso.");
        return { success: true, error: null };
      } catch (e: any) {
        console.error("Erro ao enviar e-mail:", e);
        return { success: false, error: e.message || String(e) };
      }
    })();

    // TAREFA 3: Enviar WhatsApp (Gemini + Z-API)
    const whatsappPromise = (async () => {
      try {
        let mensagemWhatsApp = "";
        let erroIA = null;
        
        // 3.1 Gerar mensagem com IA
        try {
          let apiKey = process.env.CHAVE_IA_GEMINI || process.env.GEMINI_API_KEY || "";
          apiKey = apiKey.replace(/['"]/g, '').trim();
          
          if (!apiKey || apiKey === "AI Studio Free Tier") throw new Error("Chave da IA inválida.");
          
          // Buscar prompt customizado do banco de dados
          let customPrompt = "";
          try {
            const promptDoc = await getDoc(doc(db, 'settings', 'ai_prompt'));
            if (promptDoc.exists()) {
              customPrompt = promptDoc.data()?.text || "";
            }
          } catch (e) {
            console.error("Erro ao buscar prompt customizado, usando padrão:", e);
          }

          let promptTemplate = customPrompt || `Você é um assistente do escritório Sichel & Duboc. Lead: {nome}. Aposentadoria: {aposentadoriaComplementar}. Contribuiu 89-95: {contribuicao89a95}. Paga IR: {pagaIrAtualmente}. Crie uma mensagem curta de WhatsApp agradecendo, dizendo se é promissor e fazendo uma pergunta aberta. Assine Equipe Sichel & Duboc.`;
          
          const primeiroNome = nome ? nome.split(' ')[0] : 'Cliente';
          const prompt = promptTemplate
            .replace(/{nome}/g, primeiroNome)
            .replace(/{aposentadoriaComplementar}/g, aposentadoriaComplementar || 'Não informado')
            .replace(/{contribuicao89a95}/g, contribuicao89a95 || 'Não informado')
            .replace(/{pagaIrAtualmente}/g, pagaIrAtualmente || 'Não informado');
          
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
          });
          mensagemWhatsApp = response.text || "Olá! Recebemos seu contato no site da Sichel & Duboc. Um de nossos advogados falará com você em breve!";
        } catch (aiError: any) {
          console.error("Erro na IA:", aiError);
          erroIA = aiError.message;
          const primeiroNome = nome ? nome.split(' ')[0] : 'Cliente';
          mensagemWhatsApp = `Olá, ${primeiroNome}! Recebemos seu contato no site da Sichel & Duboc. Um de nossos especialistas vai analisar seu caso e entrará em contato. Qual o melhor horário para falarmos?`;
        }

        // 3.2 Enviar via Z-API
        const zApiUrl = "https://api.z-api.io/instances/3F04463B905D722D1841026B50D22DF4/token/DA7B3B0DBC0D106EAB56DF63/send-text";
        const zApiHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (process.env.ZAPI_CLIENT_TOKEN) zApiHeaders["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const zApiResponse = await fetch(zApiUrl, {
          method: "POST",
          headers: zApiHeaders,
          body: JSON.stringify({ phone: formattedPhone, message: mensagemWhatsApp }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const zApiText = await zApiResponse.text();
        
        if (!zApiResponse.ok) throw new Error(`Z-API Status ${zApiResponse.status}: ${zApiText}`);
        
        // 3.3 Salvar mensagem no banco
        try {
          await addDoc(collection(db, 'messages'), {
            leadId,
            text: mensagemWhatsApp,
            sender: 'bot',
            createdAt: new Date().toISOString()
          });
        } catch (msgError) {
          console.error("Erro ao salvar mensagem:", msgError);
        }

        return { success: true, error: null, erroIA };
      } catch (e: any) {
        console.error("Erro no WhatsApp:", e);
        return { success: false, error: e.message || String(e), erroIA: null };
      }
    })();

    // EXECUTAR TUDO AO MESMO TEMPO (PARALELO)
    const [dbResult, emailResult, whatsappResult] = await Promise.all([
      dbPromise,
      emailPromise,
      whatsappPromise
    ]);

    if (!emailResult.success && !whatsappResult.success) {
      return res.status(500).json({ 
        error: "Falha ao enviar e-mail e WhatsApp.",
        detalhes: { email: emailResult.error, whatsapp: whatsappResult.error }
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Processado com sucesso!",
      avisos: {
        email: emailResult.success ? "Enviado" : emailResult.error,
        whatsapp: whatsappResult.success ? "Enviado" : whatsappResult.error,
        ia: whatsappResult.erroIA ? whatsappResult.erroIA : "Sucesso"
      }
    });
  } catch (error) {
    console.error("Erro geral no servidor:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
}

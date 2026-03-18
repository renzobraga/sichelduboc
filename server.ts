import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import submitFormHandler from "./api/submit-form.js";
import webhookZapiHandler from "./api/webhook-zapi.js";
import sendMessageHandler from "./api/send-message.js";
import cronFollowupsHandler from "./api/cron-followups.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for form submission
  app.post("/api/submit-form", submitFormHandler);
  
  // Webhook para Z-API
  app.post("/api/webhook-zapi", webhookZapiHandler);

  // Envio manual de mensagem
  app.post("/api/send-message", sendMessageHandler);

  // Cron job para follow-ups
  app.get("/api/cron-followups", cronFollowupsHandler);
  app.post("/api/cron-followups", cronFollowupsHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

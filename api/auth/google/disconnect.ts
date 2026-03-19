import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleGoogleDisconnect } from "../../google-calendar.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleGoogleDisconnect(req as any, res as any);
}

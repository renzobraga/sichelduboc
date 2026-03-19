import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleGoogleCallback } from "../../google-calendar.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleGoogleCallback(req as any, res as any);
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGoogleAuthUrl } from "../../google-calendar.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return getGoogleAuthUrl(req as any, res as any);
}

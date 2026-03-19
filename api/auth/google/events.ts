import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGoogleEvents } from "../../google-calendar.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return getGoogleEvents(req as any, res as any);
}

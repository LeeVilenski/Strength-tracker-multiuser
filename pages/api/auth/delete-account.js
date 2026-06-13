import { deleteUserData } from "../../../lib/db";
import { requireUser, clearSessionCookie } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const athleteId = requireUser(req, res);
  if (!athleteId) return;

  try {
    await deleteUserData(athleteId);
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

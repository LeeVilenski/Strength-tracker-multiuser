import { getAllUsers } from "../../../lib/db";
import { requireUser } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const athleteId = requireUser(req, res);
  if (!athleteId) return;

  const adminId = process.env.ADMIN_ATHLETE_ID;
  if (!adminId || String(athleteId) !== String(adminId)) {
    // Include the caller's own athlete ID so the real owner can copy it
    // into ADMIN_ATHLETE_ID without having to dig through the database.
    return res.status(403).json({ error: "Not authorized", yourAthleteId: String(athleteId) });
  }

  try {
    const users = await getAllUsers();
    res.status(200).json({ users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

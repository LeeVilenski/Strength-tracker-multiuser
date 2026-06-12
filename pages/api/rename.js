import { updateStravaActivityFields, renameCachedActivity } from "../../lib/db";
import { pinOk } from "../../lib/pin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { activity_id, name, pin } = req.body;
    if (!pinOk(pin)) {
      return res.status(401).json({ error: "Incorrect PIN", pinRequired: true });
    }
    if (!activity_id || !name) {
      return res.status(400).json({ error: "activity_id and name required" });
    }
    await updateStravaActivityFields(activity_id, { name });
    if (/^\d+$/.test(String(activity_id))) {
      await renameCachedActivity(activity_id, name);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

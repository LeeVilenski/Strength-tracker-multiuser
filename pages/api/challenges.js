import { getMonthlyChallenges, saveMonthlyChallenge, completeMonthlyChallenge } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const challenges = await getMonthlyChallenges();
      res.status(200).json({ challenges });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else if (req.method === "POST") {
    try {
      const { action, monthKey, challenge, bonusXp } = req.body;
      if (!monthKey) return res.status(400).json({ error: "monthKey required" });
      if (action === "save") {
        if (!challenge) return res.status(400).json({ error: "challenge required" });
        await saveMonthlyChallenge(monthKey, challenge);
      } else if (action === "complete") {
        await completeMonthlyChallenge(monthKey, bonusXp || 0);
      } else {
        return res.status(400).json({ error: "action must be save or complete" });
      }
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

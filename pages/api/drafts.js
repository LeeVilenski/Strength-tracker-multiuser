import { getWorkoutDrafts, saveWorkoutDraft, deleteWorkoutDraft } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const drafts = await getWorkoutDrafts();
      res.status(200).json({ drafts });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    try {
      const { draft } = req.body;
      if (!draft?.id || !draft?.title) {
        return res.status(400).json({ error: "draft.id and draft.title required" });
      }
      await saveWorkoutDraft(draft);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });
      await deleteWorkoutDraft(id);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

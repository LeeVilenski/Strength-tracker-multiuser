import { getAllExerciseNotes, saveExerciseNotes, getCustomExercises, getStravaActivity, updateStravaActivityDescription } from "../../lib/db";
import { EXERCISE_LIBRARY } from "../../lib/exercises";
import { buildExerciseBlock, mergeDescription } from "../../lib/description";
import { pinOk } from "../../lib/pin";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const notes = await getAllExerciseNotes();
      res.status(200).json({ notes });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    try {
      const { activity_id, notes, pin, xpGain } = req.body;
      if (!activity_id || !notes) {
        return res.status(400).json({ error: "activity_id and notes required" });
      }

      // Synced Strava activities get their description updated below, so this
      // whole save is PIN-gated. Manual sessions (non-numeric ids) are local
      // only and don't require a PIN.
      const isStravaActivity = /^\d+$/.test(String(activity_id));
      if (isStravaActivity && !pinOk(pin)) {
        return res.status(401).json({ error: "Incorrect PIN", pinRequired: true });
      }

      await saveExerciseNotes(activity_id, notes);

      // Mirror the exercise breakdown into the Strava activity's description.
      // Manual (locally-logged) sessions have no corresponding Strava activity.
      let stravaSynced = false;
      let stravaError = null;
      if (isStravaActivity) {
        try {
          const customExercises = await getCustomExercises();
          const allExercises = [...EXERCISE_LIBRARY, ...customExercises];
          const block = buildExerciseBlock(notes, allExercises, { xpGain, appUrl: process.env.NEXT_PUBLIC_APP_URL });
          const activity = await getStravaActivity(activity_id);
          const merged = mergeDescription(activity.description, block);
          await updateStravaActivityDescription(activity_id, merged);
          stravaSynced = true;
        } catch (e) {
          stravaError = e.message;
          console.error("Strava description sync failed:", e.message);
        }
      }

      res.status(200).json({ ok: true, stravaSynced, stravaError });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

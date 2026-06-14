import { getAllExerciseNotes, saveExerciseNotes, getCustomExercises, getStravaActivity, updateStravaActivityDescription } from "../../lib/db";
import { EXERCISE_LIBRARY } from "../../lib/exercises";
import { buildExerciseBlock, mergeDescription } from "../../lib/description";
import { requireUser } from "../../lib/session";

export default async function handler(req, res) {
  const athleteId = requireUser(req, res);
  if (!athleteId) return;

  if (req.method === "GET") {
    try {
      const notes = await getAllExerciseNotes(athleteId);
      res.status(200).json({ notes });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    try {
      const { activity_id, notes, xpGain, challengeCompleted } = req.body;
      if (!activity_id || !notes) {
        return res.status(400).json({ error: "activity_id and notes required" });
      }

      await saveExerciseNotes(athleteId, activity_id, notes);

      // Mirror the exercise breakdown into the Strava activity's description.
      // Manual (locally-logged) sessions have no corresponding Strava activity.
      const isStravaActivity = /^\d+$/.test(String(activity_id));
      let stravaSynced = false;
      let stravaError = null;
      if (isStravaActivity) {
        try {
          const customExercises = await getCustomExercises(athleteId);
          const allExercises = [...EXERCISE_LIBRARY, ...customExercises];
          const block = buildExerciseBlock(notes, allExercises, { xpGain, challengeCompleted, appUrl: process.env.NEXT_PUBLIC_APP_URL });
          const activity = await getStravaActivity(athleteId, activity_id);
          const merged = mergeDescription(activity.description, block);
          await updateStravaActivityDescription(athleteId, activity_id, merged);
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

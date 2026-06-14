import { getCustomExercises, createStravaActivity, uploadStravaActivity, pollStravaUpload } from "../../lib/db";
import { EXERCISE_LIBRARY } from "../../lib/exercises";
import { buildExerciseBlock } from "../../lib/description";
import { buildWorkoutFit } from "../../lib/fit-builder";
import { requireUser } from "../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const athleteId = requireUser(req, res);
  if (!athleteId) return;

  try {
    const { session, notes, xpGain, challengeCompleted } = req.body;
    if (!session?.id || !session?.date) {
      return res.status(400).json({ error: "session required" });
    }

    const customExercises = await getCustomExercises(athleteId);
    const allExercises = [...EXERCISE_LIBRARY, ...customExercises];

    const block = buildExerciseBlock(notes, allExercises, { xpGain, challengeCompleted, appUrl: process.env.NEXT_PUBLIC_APP_URL });
    if (!block) {
      return res.status(400).json({ error: "No logged sets to push - add exercises first" });
    }
    const description = [notes?.sessionNotes, block].filter(Boolean).join("\n\n");
    const sportType = session.sport_type || "Workout";
    const fitBuffer = buildWorkoutFit({ session, notes, allExercises });

    let activityId;
    if (fitBuffer) {
      // Upload a FIT file with structured "set" messages so Strava's Strength
      // Training UI can show per-exercise sets/reps/weight, alongside the
      // same plain-text description block used for non-manual activities.
      const upload = await uploadStravaActivity(athleteId, {
        fitBuffer,
        name: session.name,
        sportType,
        description,
        externalId: session.id,
      });
      activityId = await pollStravaUpload(athleteId, upload.id);
    } else {
      const activity = await createStravaActivity(athleteId, {
        name: session.name,
        sportType,
        startDateLocal: `${session.date}T12:00:00`,
        elapsedTime: Math.max(60, Math.round(session.duration || 0)),
        description,
      });
      activityId = activity.id;
    }

    res.status(200).json({ activityId: String(activityId) });
  } catch (e) {
    console.error("push-strava error:", e);
    res.status(500).json({ error: e.message });
  }
}

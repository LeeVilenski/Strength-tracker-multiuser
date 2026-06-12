import { getCustomExercises, uploadStrengthActivity, getStravaUploadStatus, updateStravaActivityFields } from "../../lib/db";
import { EXERCISE_LIBRARY } from "../../lib/exercises";
import { buildStrengthUploadJSON } from "../../lib/strava-upload";
import { buildExerciseBlock } from "../../lib/description";

const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 1000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { session, notes, utcOffset } = req.body;
    if (!session?.id || !session?.date) {
      return res.status(400).json({ error: "session required" });
    }

    const customExercises = await getCustomExercises();
    const allExercises = [...EXERCISE_LIBRARY, ...customExercises];

    const payload = buildStrengthUploadJSON({ session, notes, allExercises, utcOffset });
    if (!payload) {
      return res.status(400).json({ error: "No logged sets to push - add exercises first" });
    }

    const upload = await uploadStrengthActivity(payload, session.id, session.sport_type || "Workout");

    let activityId = upload.activity_id;
    let status = upload;
    for (let i = 0; i < POLL_ATTEMPTS && !activityId && !status.error; i++) {
      await new Promise(r => setTimeout(r, POLL_DELAY_MS));
      status = await getStravaUploadStatus(upload.id);
      activityId = status.activity_id;
    }

    if (status.error) {
      console.error("Strava upload failed:", JSON.stringify(status), "payload:", JSON.stringify(payload));
      const dup = status.error.match(/duplicate of activity '?(\d+)/);
      if (dup) activityId = dup[1];
      else return res.status(502).json({ error: status.error });
    }

    if (!activityId) {
      return res.status(202).json({ status: "processing", uploadId: upload.id });
    }

    const block = buildExerciseBlock(notes, allExercises);
    const description = [notes?.sessionNotes, block].filter(Boolean).join("\n\n");
    await updateStravaActivityFields(activityId, { name: session.name, description });

    res.status(200).json({ activityId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

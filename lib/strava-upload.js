import { getStravaExerciseType } from "./exercises";

const KG_PER_LB = 0.453592;

function toKg(weight, weightUnit) {
  const w = parseFloat(weight) || 0;
  return weightUnit === "lbs" ? w * KG_PER_LB : w;
}

// Format a signed UTC offset (in seconds) as "+HH:MM" / "-HH:MM" for an
// ISO8601 start_time string.
export function formatOffset(offsetSeconds) {
  const sign = offsetSeconds < 0 ? "-" : "+";
  const abs = Math.abs(offsetSeconds || 0);
  const hours = String(Math.floor(abs / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

// Build a Strava structured Workout Log JSON upload payload for a manually
// logged session. Returns null if there are no sets worth uploading.
export function buildStrengthUploadJSON({ session, notes, allExercises, utcOffset }) {
  const sets = [];
  for (const [exId, value] of Object.entries(notes?.exercises || {})) {
    if (!value?.sets) continue;
    const ex = allExercises.find(e => e.id === exId);
    const exerciseType = getStravaExerciseType(ex);
    const isTimed = ex?.unit === "sec";
    for (const set of value.sets) {
      const amount = parseInt(set.reps) || 0;
      if (!amount) continue;
      const entry = { exercise_type: exerciseType };
      if (isTimed) entry.duration = amount;
      else entry.repetitions = amount;
      const kg = toKg(set.weight, set.weightUnit);
      if (kg > 0) entry.weight = Math.round(kg * 100) / 100;
      sets.push(entry);
    }
  }
  if (sets.length === 0) return null;

  const elapsed = Math.max(0, Math.round(session.duration || 0));

  return {
    version: "1.0",
    start_time: `${session.date}T12:00:00${formatOffset(utcOffset)}`,
    utc_offset: utcOffset || 0,
    elapsed_time: elapsed,
    active_time: elapsed,
    creator: { name: "Strength Tracker" },
    sets,
  };
}

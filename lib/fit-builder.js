// ---------------------------------------------------------------------------
// Builds a minimal FIT activity file containing "set" messages (mesgNum 225)
// so Strava's Strength Training UI can show per-exercise sets/reps/weight for
// manually-logged sessions. Returns null if there are no loggable sets.
// ---------------------------------------------------------------------------

import { Encoder, Profile } from "@garmin/fitsdk";
import { EXERCISE_FIT_MAP } from "./exercise-fit-map";

const KG_PER_LB = 0.453592;
const DEV_SERIAL_NUMBER = 1;

function findExerciseNameIndex(category, name) {
  const enumValues = Profile.types[`${category}ExerciseName`];
  if (!enumValues) return null;
  for (const [idx, value] of Object.entries(enumValues)) {
    if (value === name) return Number(idx);
  }
  return null;
}

export function buildWorkoutFit({ session, notes, allExercises }) {
  const sets = [];
  for (const [exId, value] of Object.entries(notes?.exercises || {})) {
    const exercise = allExercises.find(e => e.id === exId);
    const unit = exercise?.unit || "reps";
    const fitExercise = EXERCISE_FIT_MAP[exId];
    for (const set of value?.sets || []) {
      if (!set.reps) continue;
      sets.push({ unit, fitExercise, reps: parseFloat(set.reps), weight: parseFloat(set.weight) || 0, weightUnit: set.weightUnit || "kg" });
    }
  }
  if (sets.length === 0) return null;

  const startTime = new Date(`${session.date}T12:00:00`);
  const elapsedSeconds = Math.max(60, Math.round(session.duration || 0));
  const endTime = new Date(startTime.getTime() + elapsedSeconds * 1000);
  const spacing = Math.max(1, Math.floor(elapsedSeconds / sets.length));

  const encoder = new Encoder();

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: "activity",
    manufacturer: "development",
    product: 0,
    serialNumber: DEV_SERIAL_NUMBER,
    timeCreated: startTime,
  });

  let t = startTime.getTime();
  sets.forEach((set, i) => {
    const mesg = {
      mesgNum: Profile.MesgNum.SET,
      messageIndex: i,
      timestamp: new Date(t),
      startTime: new Date(t),
      setType: "active",
      weightDisplayUnit: "kilogram",
    };

    if (set.unit === "sec") {
      mesg.duration = set.reps;
    } else {
      mesg.repetitions = Math.round(set.reps);
    }

    const weightKg = set.weightUnit === "lbs" ? set.weight * KG_PER_LB : set.weight;
    if (weightKg > 0) {
      mesg.weight = weightKg;
    }

    if (set.fitExercise) {
      mesg.category = [set.fitExercise.category];
      const subtype = findExerciseNameIndex(set.fitExercise.category, set.fitExercise.name);
      if (subtype != null) mesg.categorySubtype = [subtype];
    }

    encoder.writeMesg(mesg);
    t += spacing * 1000;
  });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.SESSION,
    messageIndex: 0,
    timestamp: endTime,
    startTime,
    totalElapsedTime: elapsedSeconds,
    totalTimerTime: elapsedSeconds,
    sport: "training",
    subSport: "strengthTraining",
    event: "session",
    eventType: "stop",
    ...(session.avg_hr ? { avgHeartRate: Math.round(session.avg_hr) } : {}),
    ...(session.max_hr ? { maxHeartRate: Math.round(session.max_hr) } : {}),
  });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.ACTIVITY,
    timestamp: endTime,
    totalTimerTime: elapsedSeconds,
    numSessions: 1,
    type: "manual",
    event: "activity",
    eventType: "stop",
  });

  return Buffer.from(encoder.close());
}

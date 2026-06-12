// ---------------------------------------------------------------------------
// Muscle groups
// ---------------------------------------------------------------------------
export const MUSCLE_GROUPS = {
  chest:      { label: "Chest",      emoji: "💪", color: "#ef4444", lightBg: "#fef2f2", border: "#fecaca" },
  back:       { label: "Back",       emoji: "🏋️", color: "#8b5cf6", lightBg: "#f5f3ff", border: "#ddd6fe" },
  shoulders:  { label: "Shoulders",  emoji: "🔱", color: "#0891b2", lightBg: "#ecfeff", border: "#a5f3fc" },
  triceps:    { label: "Triceps",    emoji: "⚡", color: "#d97706", lightBg: "#fffbeb", border: "#fde68a" },
  biceps:     { label: "Biceps",     emoji: "💥", color: "#16a34a", lightBg: "#f0fdf4", border: "#bbf7d0" },
  core:       { label: "Core",       emoji: "🎯", color: "#db2777", lightBg: "#fdf2f8", border: "#fbcfe8" },
  quads:      { label: "Quads",      emoji: "🦵", color: "#7c3aed", lightBg: "#faf5ff", border: "#e9d5ff" },
  hamstrings: { label: "Hamstrings", emoji: "🦵", color: "#6d28d9", lightBg: "#f5f3ff", border: "#ddd6fe" },
  glutes:     { label: "Glutes",     emoji: "🍑", color: "#be185d", lightBg: "#fdf2f8", border: "#fbcfe8" },
  calves:     { label: "Calves",     emoji: "🦶", color: "#0369a1", lightBg: "#f0f9ff", border: "#bae6fd" },
};

// Which muscles each exercise hits (primary first)
export const EXERCISE_MUSCLES = {
  pushup:         ["chest", "triceps", "shoulders"],
  pullup:         ["back", "biceps"],
  dip:            ["triceps", "chest"],
  row:            ["back", "biceps"],
  plank:          ["core"],
  shoulder_press: ["shoulders", "triceps"],
  bicep_curl:     ["biceps"],
  tricep_ext:     ["triceps"],
};

// ---------------------------------------------------------------------------
// XP & levelling — exponential curve
// XP to reach level N = 100 * (1.6 ^ N)
// Level 1: 160 XP, Level 2: 256, Level 3: 410, Level 4: 655 ...
// ---------------------------------------------------------------------------
export function xpForLevel(level) {
  return Math.round(100 * Math.pow(1.6, level));
}

export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) total += xpForLevel(i);
  return total;
}

export function levelFromXp(xp) {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForLevel(level + 1)) {
    remaining -= xpForLevel(level + 1);
    level++;
  }
  return { level, currentXp: remaining, xpNeeded: xpForLevel(level + 1) };
}

// XP earned per rep/sec
export const XP_PER_REP = 2;
export const XP_PER_SEC = 0.5;
// Weight bonus: +1 XP per rep per 10kg (so 20kg adds 2x bonus per rep)
export const XP_PER_KG_PER_REP = 0.1;

// value can be:
//   - old format: plain number string "20"
//   - new format: { sets: [{reps, weight, weightUnit}] }
export function xpForExercise(exerciseId, value) {
  if (!value) return 0;
  // New sets format
  if (typeof value === "object" && value.sets) {
    let xp = 0;
    for (const set of value.sets) {
      const reps = parseInt(set.reps) || 0;
      const kg = set.weightUnit === "lbs"
        ? (parseFloat(set.weight) || 0) * 0.453592
        : (parseFloat(set.weight) || 0);
      if (exerciseId === "plank") {
        xp += Math.round(reps * XP_PER_SEC);
      } else {
        xp += Math.round(reps * (XP_PER_REP + kg * XP_PER_KG_PER_REP));
      }
    }
    return xp;
  }
  // Legacy format: plain number
  const v = parseInt(value);
  if (isNaN(v)) return 0;
  if (exerciseId === "plank") return Math.round(v * XP_PER_SEC);
  return Math.round(v * XP_PER_REP);
}

// Get total reps from a value (for PB comparison and display)
export function totalRepsFromValue(value) {
  if (!value) return 0;
  if (typeof value === "object" && value.sets) {
    return value.sets.reduce((acc, s) => acc + (parseInt(s.reps) || 0), 0);
  }
  return parseInt(value) || 0;
}

// Get best set weight from a value
export function bestWeightFromValue(value) {
  if (!value || typeof value !== "object" || !value.sets) return 0;
  return Math.max(0, ...value.sets.map(s => {
    const kg = s.weightUnit === "lbs"
      ? (parseFloat(s.weight) || 0) * 0.453592
      : (parseFloat(s.weight) || 0);
    return kg;
  }));
}

// Summary string for display e.g. "3×10 @ 20kg"
export function summariseSets(value) {
  if (!value) return "";
  if (typeof value === "object" && value.sets && value.sets.length > 0) {
    const sets = value.sets.filter(s => s.reps);
    if (sets.length === 0) return "";
    // Check if all sets same reps+weight
    const first = sets[0];
    const uniform = sets.every(s => s.reps === first.reps && s.weight === first.weight && s.weightUnit === first.weightUnit);
    if (uniform && sets.length > 1) {
      const w = parseFloat(first.weight);
      const weightStr = w > 0 ? ` @ ${w}${first.weightUnit || "kg"}` : " bodyweight";
      return `${sets.length}×${first.reps}${weightStr}`;
    }
    return sets.map(s => {
      const w = parseFloat(s.weight);
      return w > 0 ? `${s.reps}@${w}${s.weightUnit||"kg"}` : `${s.reps}`;
    }).join(", ");
  }
  return String(value);
}

// Decay: lose 15 XP per day after 14 days of no training for a muscle
export const DECAY_GRACE_DAYS = 14;
export const DECAY_PER_DAY = 15;

// The "Overall" / body level decays much faster — short grace period, steep daily loss
export const BODY_DECAY_GRACE_DAYS = 3;
export const BODY_DECAY_PER_DAY = 30;

// One-off XP bonus awarded to the Overall level when a monthly challenge is completed
export const CHALLENGE_BONUS_XP = 200;

// Styling for the synthetic "body" / Overall level (not a real muscle group)
export const BODY_GROUP = { label: "Overall", emoji: "⭐", color: "#eab308", lightBg: "#fefce8", border: "#fde68a" };

export function applyDecay(xp, lastTrainedDate, graceDays = DECAY_GRACE_DAYS, perDay = DECAY_PER_DAY) {
  if (!lastTrainedDate) return xp;
  const days = Math.floor((new Date() - new Date(lastTrainedDate + "T12:00:00")) / 86400000);
  const decayDays = Math.max(0, days - graceDays);
  return Math.max(0, xp - decayDays * perDay);
}

// ---------------------------------------------------------------------------
// Consistency streak multiplier
// A "week" is Mon–Sun. Train a muscle in consecutive weeks = streak.
// Multiplier: 1.0 + (streak - 1) * 0.2, capped at 2.0 (5 weeks)
// ---------------------------------------------------------------------------
export const STREAK_MULTIPLIER_PER_WEEK = 0.2;
export const STREAK_MAX = 5;

export function streakMultiplier(streak) {
  return 1 + Math.min(streak - 1, STREAK_MAX - 1) * STREAK_MULTIPLIER_PER_WEEK;
}

// Get the ISO week key for a date string "YYYY-MM-DD"
// Returns "YYYY-Www" e.g. "2026-W23"
function weekKey(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.floor((d - startOfWeek1) / (7 * 86400000)) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Compute consecutive weekly streak for a muscle up to the current week
// weeksTrainedSet: Set of "YYYY-Www" strings when this muscle was trained
function computeStreak(weeksTrainedSet) {
  if (weeksTrainedSet.size === 0) return 0;
  const now = new Date();
  let streak = 0;
  let d = new Date(now);
  // Start from current week, walk backwards
  for (let i = 0; i < 52; i++) {
    const key = weekKey(d.toISOString().slice(0, 10));
    if (weeksTrainedSet.has(key)) {
      streak++;
      d.setDate(d.getDate() - 7);
    } else {
      // Allow one week gap only if it's the very current week (might not have trained yet)
      if (i === 0) {
        d.setDate(d.getDate() - 7);
        continue;
      }
      break;
    }
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Shared XP/level/streak computation for a single muscle (or the "body" pseudo-muscle)
// ---------------------------------------------------------------------------
function computeXpAndStats(weeklyXpForMg, lastTrainedDate, weeksTrainedSetForMg, graceDays = DECAY_GRACE_DAYS, perDay = DECAY_PER_DAY, bonusXp = 0) {
  // Sort weeks chronologically and build streak at each point in time to apply the right multiplier
  const sortedWeeks = Object.keys(weeklyXpForMg).sort();
  let runningStreak = 0;
  let prevWk = null;
  let rawXp = 0;

  for (const wk of sortedWeeks) {
    if (prevWk) {
      const [py, pw] = prevWk.split("-W").map(Number);
      const [cy, cw] = wk.split("-W").map(Number);
      const isConsecutive = (cy === py && cw === pw + 1) || (cy === py + 1 && pw >= 52 && cw === 1);
      runningStreak = isConsecutive ? runningStreak + 1 : 1;
    } else {
      runningStreak = 1;
    }
    prevWk = wk;
    const mult = streakMultiplier(runningStreak);
    rawXp += Math.round(weeklyXpForMg[wk] * mult);
  }

  rawXp += Math.max(0, bonusXp);

  const streak = computeStreak(weeksTrainedSetForMg);
  const currentMultiplier = streakMultiplier(Math.max(streak, 1));
  const effective = applyDecay(rawXp, lastTrainedDate, graceDays, perDay);
  const { level, currentXp, xpNeeded } = levelFromXp(effective);
  return {
    rawXp,
    effectiveXp: effective,
    level, currentXp, xpNeeded,
    lastTrained: lastTrainedDate,
    streak,
    multiplier: currentMultiplier,
  };
}

// ---------------------------------------------------------------------------
// Compute muscle XP from all logged notes (with streak multiplier)
// Also computes a synthetic "body" entry: XP from every logged exercise
// regardless of target muscles, decaying much faster, optionally boosted by
// a one-off challenge-completion bonus (bodyBonusXp).
// Returns: { chest: { rawXp, effectiveXp, level, currentXp, xpNeeded, lastTrained, streak, multiplier }, ..., body: {...} }
// ---------------------------------------------------------------------------
export function computeMuscleStats(allNotes, strength, allExercises, bodyBonusXp = 0) {
  const exerciseMuscleMap = {};
  if (allExercises && allExercises.length > 0) {
    for (const ex of allExercises) exerciseMuscleMap[ex.id] = ex.muscles || [];
  } else {
    Object.assign(exerciseMuscleMap, EXERCISE_MUSCLES);
  }

  const dateMap = {};
  for (const s of strength) dateMap[s.id] = s.date;

  const allMuscleIds = new Set(Object.keys(MUSCLE_GROUPS));
  for (const muscles of Object.values(exerciseMuscleMap)) {
    for (const m of muscles) allMuscleIds.add(m);
  }

  // Per-muscle: track XP per week bucket (to apply streak multiplier)
  // weeklyXp[mg][weekKey] = xp earned that week
  const weeklyXp = {};
  const lastTrained = {};
  const weeksTrainedSet = {}; // mg -> Set of week keys
  for (const mg of allMuscleIds) {
    weeklyXp[mg] = {};
    lastTrained[mg] = null;
    weeksTrainedSet[mg] = new Set();
  }
  // "body" tracks XP from every logged exercise, regardless of target muscles
  weeklyXp.body = {};
  lastTrained.body = null;
  weeksTrainedSet.body = new Set();

  const noteEntries = Object.entries(allNotes)
    .map(([actId, note]) => ({ actId, note, date: dateMap[actId] || "0000-00-00" }))
    .filter(e => e.date !== "0000-00-00")
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const { note, date } of noteEntries) {
    if (!note?.exercises) continue;
    const wk = weekKey(date);
    for (const [exId, value] of Object.entries(note.exercises)) {
      if (!value) continue;
      const muscles = exerciseMuscleMap[exId] || [];
      const baseXp = xpForExercise(exId, value);
      for (const mg of muscles) {
        const multiplier = muscles.indexOf(mg) === 0 ? 1 : 0.4;
        const xp = Math.round(baseXp * multiplier);
        if (!weeklyXp[mg][wk]) weeklyXp[mg][wk] = 0;
        weeklyXp[mg][wk] += xp;
        weeksTrainedSet[mg].add(wk);
        if (!lastTrained[mg] || date > lastTrained[mg]) lastTrained[mg] = date;
      }
      // "body" earns the full base XP for every logged exercise
      if (!weeklyXp.body[wk]) weeklyXp.body[wk] = 0;
      weeklyXp.body[wk] += baseXp;
      weeksTrainedSet.body.add(wk);
      if (!lastTrained.body || date > lastTrained.body) lastTrained.body = date;
    }
  }

  const result = {};
  for (const mg of allMuscleIds) {
    result[mg] = computeXpAndStats(weeklyXp[mg], lastTrained[mg], weeksTrainedSet[mg]);
  }
  result.body = computeXpAndStats(weeklyXp.body, lastTrained.body, weeksTrainedSet.body, BODY_DECAY_GRACE_DAYS, BODY_DECAY_PER_DAY, bodyBonusXp);

  return result;
}

// ---------------------------------------------------------------------------
// Diff two muscleStats snapshots (before/after a save) for toast feedback
// Returns { totalXp, levelUps: [{ muscle, fromLevel, toLevel }] }
// ---------------------------------------------------------------------------
export function diffMuscleStats(before, after) {
  let totalXp = 0;
  const levelUps = [];
  // "body" tracks the same training XP in parallel — exclude it here so the
  // toast doesn't double-count XP already reported per muscle.
  for (const mg of Object.keys(after).filter(id => id !== "body")) {
    const b = before[mg] || { effectiveXp: 0, level: 0 };
    const a = after[mg];
    totalXp += Math.max(0, a.effectiveXp - b.effectiveXp);
    if (a.level > b.level) levelUps.push({ muscle: mg, fromLevel: b.level, toLevel: a.level });
  }
  const bBody = before.body || { level: 0 };
  const aBody = after.body || { level: 0 };
  const bodyLevelUp = aBody.level > bBody.level ? { fromLevel: bBody.level, toLevel: aBody.level } : null;
  return { totalXp, levelUps, bodyLevelUp };
}

// ---------------------------------------------------------------------------
// PB detection
// Returns array of exercise IDs that are PBs in this session
// ---------------------------------------------------------------------------
export function detectPBs(newExercises, allNotes, currentActivityId) {
  const pbs = [];
  for (const [exId, value] of Object.entries(newExercises)) {
    if (!value) continue;
    const newTotal = totalRepsFromValue(value);
    const newBestWeight = bestWeightFromValue(value);
    // Find max total reps and best weight across all OTHER sessions
    const prevVals = Object.entries(allNotes)
      .filter(([id]) => id !== currentActivityId)
      .map(([, n]) => n?.exercises?.[exId])
      .filter(Boolean);
    const prevMaxReps = Math.max(0, ...prevVals.map(v => totalRepsFromValue(v)));
    const prevMaxWeight = Math.max(0, ...prevVals.map(v => bestWeightFromValue(v)));
    const isFirst = prevVals.length === 0 && newTotal > 0;
    if (isFirst) { pbs.push(`${exId}_first`); continue; }
    if (newTotal > prevMaxReps) pbs.push(exId);
    else if (newBestWeight > prevMaxWeight && newBestWeight > 0) pbs.push(`${exId}_weight`);
  }
  return pbs;
}

// ---------------------------------------------------------------------------
// Monthly challenge generation
// ---------------------------------------------------------------------------
export function generateMonthlyChallenge(muscleStats, month, allExercises) {
  const allMuscleIds = Object.keys(muscleStats).filter(id => id !== "body");
  const trained = allMuscleIds.filter(id => (muscleStats[id]?.rawXp || 0) > 0);
  const untrained = allMuscleIds.filter(id => (muscleStats[id]?.rawXp || 0) === 0);

  let targetMuscle;
  if (untrained.length > 0) {
    targetMuscle = untrained[month % untrained.length];
  } else {
    targetMuscle = [...trained].sort((a, b) => (muscleStats[a]?.level || 0) - (muscleStats[b]?.level || 0))[0];
  }

  const mg = MUSCLE_GROUPS[targetMuscle] || { label: targetMuscle, emoji: "💪", color: "#6b7280", lightBg: "#f9fafb", border: "#e5e7eb" };

  // Find exercises that primarily target this muscle
  const exerciseLib = allExercises || [];
  const primaryExercises = exerciseLib.filter(ex => ex.muscles?.[0] === targetMuscle);
  // Pick a varied one based on month
  const ex = primaryExercises[month % Math.max(primaryExercises.length, 1)] || primaryExercises[0];
  const exId = ex?.id || "pushup";
  const exLabel = ex?.label || "push-ups";

  const CHALLENGE_TYPES = [
    {
      type: "frequency",
      title: (ex) => `Log ${ex} in 4 sessions this month`,
      description: (mg) => `Build the ${mg.label} habit — consistency beats intensity at this stage.`,
      target: 4,
      unit: "sessions",
    },
    {
      type: "pb",
      title: (ex) => `Hit a new ${ex} PB this month`,
      description: (mg) => `Push your ${mg.label} to the limit — one all-out set to beat your record.`,
      target: 1,
      unit: "PB",
    },
    {
      type: "streak",
      title: (ex, mg) => `Train ${mg.label} every week this month`,
      description: (mg) => `Four weeks straight. The streak multiplier rewards exactly this.`,
      target: 4,
      unit: "weeks",
    },
    {
      type: "volume",
      title: (ex) => `Log 100+ total ${ex} reps this month`,
      description: (mg) => `Across all sessions — quality sets add up to serious ${mg.label} volume.`,
      target: 100,
      unit: "reps",
    },
  ];

  const challengeType = CHALLENGE_TYPES[month % CHALLENGE_TYPES.length];

  return {
    muscle: targetMuscle,
    mg,
    title: challengeType.title(exLabel, mg),
    description: challengeType.description(mg),
    type: challengeType.type,
    target: challengeType.target,
    unit: challengeType.unit,
    exId,
    exLabel,
    month,
  };
}

// ---------------------------------------------------------------------------
// Monthly challenge progress — cumulative across the month for every type,
// including "pb" (current month's best vs. the prior all-time best)
// Returns { current, target, pct, done }
// ---------------------------------------------------------------------------
export function computeChallengeProgress(challenge, notes, strength, monthKey) {
  const { type, target, exId } = challenge;
  const targetMonth = monthKey || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();
  const dateMap = {};
  for (const s of strength) dateMap[String(s.id)] = s.date;
  const monthStrength = strength.filter(s => s.date?.startsWith(targetMonth));
  const monthIds = new Set(monthStrength.map(s => String(s.id)));
  const monthNotes = monthStrength.map(s => notes[s.id]).filter(Boolean);

  let current = 0, computedTarget = target, done = false;

  if (type === "frequency") {
    current = monthNotes.filter(n => n?.exercises?.[exId]).length;
    done = current >= target;
  } else if (type === "pb") {
    const prevVals = Object.entries(notes)
      .filter(([id]) => !monthIds.has(id) && (dateMap[id] || "0000-00-00") < `${targetMonth}-01`)
      .map(([, n]) => totalRepsFromValue(n?.exercises?.[exId]));
    const monthVals = monthNotes.map(n => totalRepsFromValue(n?.exercises?.[exId]));
    const previousBest = Math.max(0, ...prevVals);
    const monthMax = Math.max(0, ...monthVals);
    current = monthMax;
    computedTarget = previousBest > 0 ? previousBest : 1;
    done = previousBest > 0 ? monthMax > previousBest : monthMax > 0;
  } else if (type === "streak") {
    const weeksWithSessions = new Set(
      monthStrength.filter(s => notes[s.id]?.exercises?.[exId]).map(s => {
        const d = new Date(s.date + "T12:00:00");
        return Math.floor((d - new Date(d.getFullYear(), d.getMonth(), 1)) / 604800000);
      })
    );
    current = weeksWithSessions.size;
    done = current >= target;
  } else if (type === "volume") {
    current = monthNotes.reduce((acc, n) => acc + totalRepsFromValue(n?.exercises?.[exId]), 0);
    done = current >= target;
  }

  const pct = done ? 100 : Math.min(99, Math.round((current / computedTarget) * 100));
  return { current, target: computedTarget, pct, done };
}

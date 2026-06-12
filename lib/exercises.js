// ---------------------------------------------------------------------------
// Comprehensive exercise library
// Each exercise: { id, label, unit, muscles, category, strava }
// muscles[0] = primary, rest = secondary
// category = for grouping in the dropdown
// strava = Strava "exercise_type" identifier (category-level _GENERIC) used
//          when pushing manually-logged sessions to Strava's Workout Log API
// ---------------------------------------------------------------------------

export const EXERCISE_LIBRARY = [
  // ── CHEST ──
  { id: "bench_press",         label: "Bench Press",              unit: "reps", muscles: ["chest", "triceps", "shoulders"], category: "Chest", strava: "BENCH_PRESS_GENERIC" },
  { id: "incline_bench_press", label: "Incline Bench Press",      unit: "reps", muscles: ["chest", "triceps", "shoulders"], category: "Chest", strava: "BENCH_PRESS_GENERIC" },
  { id: "decline_bench_press", label: "Decline Bench Press",      unit: "reps", muscles: ["chest", "triceps"],             category: "Chest", strava: "BENCH_PRESS_GENERIC" },
  { id: "pushup",              label: "Push-up",                  unit: "reps", muscles: ["chest", "triceps", "shoulders"], category: "Chest", strava: "PUSH_UP_GENERIC" },
  { id: "incline_pushup",      label: "Incline Push-up",          unit: "reps", muscles: ["chest", "triceps"],             category: "Chest", strava: "PUSH_UP_GENERIC" },
  { id: "decline_pushup",      label: "Decline Push-up",          unit: "reps", muscles: ["chest", "triceps", "shoulders"], category: "Chest", strava: "PUSH_UP_GENERIC" },
  { id: "diamond_pushup",      label: "Diamond Push-up",          unit: "reps", muscles: ["triceps", "chest"],             category: "Chest", strava: "PUSH_UP_GENERIC" },
  { id: "chest_fly",           label: "Chest Fly",                unit: "reps", muscles: ["chest"],                        category: "Chest", strava: "FLYE_GENERIC" },
  { id: "cable_crossover",     label: "Cable Crossover",          unit: "reps", muscles: ["chest", "shoulders"],           category: "Chest", strava: "FLYE_GENERIC" },
  { id: "dip",                 label: "Dip",                      unit: "reps", muscles: ["triceps", "chest", "shoulders"], category: "Chest", strava: "TRICEPS_EXTENSION_GENERIC" },
  { id: "chest_press_machine", label: "Chest Press Machine",      unit: "reps", muscles: ["chest", "triceps", "shoulders"], category: "Chest", strava: "BENCH_PRESS_GENERIC" },

  // ── BACK ──
  { id: "pullup",              label: "Pull-up",                  unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "PULL_UP_GENERIC" },
  { id: "chinup",              label: "Chin-up",                  unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "PULL_UP_GENERIC" },
  { id: "lat_pulldown",        label: "Lat Pulldown",             unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "PULL_UP_GENERIC" },
  { id: "seated_row",          label: "Seated Cable Row",         unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "ROW_GENERIC" },
  { id: "bent_over_row",       label: "Bent Over Row",            unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "ROW_GENERIC" },
  { id: "t_bar_row",           label: "T-Bar Row",                unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "ROW_GENERIC" },
  { id: "inverted_row",        label: "Inverted Row",             unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "ROW_GENERIC" },
  { id: "single_arm_row",      label: "Single Arm Dumbbell Row",  unit: "reps", muscles: ["back", "biceps"],               category: "Back", strava: "ROW_GENERIC" },
  { id: "deadlift",            label: "Deadlift",                 unit: "reps", muscles: ["back", "glutes", "hamstrings"], category: "Back", strava: "DEADLIFT_GENERIC" },
  { id: "romanian_deadlift",   label: "Romanian Deadlift",        unit: "reps", muscles: ["hamstrings", "glutes", "back"], category: "Back", strava: "DEADLIFT_GENERIC" },
  { id: "good_morning",        label: "Good Morning",             unit: "reps", muscles: ["back", "hamstrings"],           category: "Back", strava: "HYPEREXTENSION_GENERIC" },
  { id: "face_pull",           label: "Face Pull",                unit: "reps", muscles: ["shoulders", "back"],            category: "Back", strava: "ROW_GENERIC" },
  { id: "back_extension",      label: "Back Extension",           unit: "reps", muscles: ["back", "glutes"],               category: "Back", strava: "HYPEREXTENSION_GENERIC" },
  { id: "dead_hang",           label: "Dead Hang",                unit: "sec",  muscles: ["back", "core"],                 category: "Back", strava: "PLANK_GENERIC" },

  // ── SHOULDERS ──
  { id: "overhead_press",      label: "Overhead Press",           unit: "reps", muscles: ["shoulders", "triceps"],         category: "Shoulders", strava: "SHOULDER_PRESS_GENERIC" },
  { id: "shoulder_press",      label: "Dumbbell Shoulder Press",  unit: "reps", muscles: ["shoulders", "triceps"],         category: "Shoulders", strava: "SHOULDER_PRESS_GENERIC" },
  { id: "arnold_press",        label: "Arnold Press",             unit: "reps", muscles: ["shoulders", "triceps"],         category: "Shoulders", strava: "SHOULDER_PRESS_GENERIC" },
  { id: "lateral_raise",       label: "Lateral Raise",            unit: "reps", muscles: ["shoulders"],                    category: "Shoulders", strava: "LATERAL_RAISE_GENERIC" },
  { id: "front_raise",         label: "Front Raise",              unit: "reps", muscles: ["shoulders"],                    category: "Shoulders", strava: "LATERAL_RAISE_GENERIC" },
  { id: "reverse_fly",         label: "Reverse Fly",              unit: "reps", muscles: ["shoulders", "back"],            category: "Shoulders", strava: "LATERAL_RAISE_GENERIC" },
  { id: "upright_row",         label: "Upright Row",              unit: "reps", muscles: ["shoulders", "back"],            category: "Shoulders", strava: "LATERAL_RAISE_GENERIC" },
  { id: "pike_pushup",         label: "Pike Push-up",             unit: "reps", muscles: ["shoulders", "triceps"],         category: "Shoulders", strava: "PUSH_UP_GENERIC" },
  { id: "handstand_pushup",    label: "Handstand Push-up",        unit: "reps", muscles: ["shoulders", "triceps"],         category: "Shoulders", strava: "PUSH_UP_GENERIC" },
  { id: "shrug",               label: "Shrug",                    unit: "reps", muscles: ["shoulders", "back"],            category: "Shoulders", strava: "SHRUG_GENERIC" },

  // ── ARMS: BICEPS ──
  { id: "bicep_curl",          label: "Bicep Curl",               unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },
  { id: "hammer_curl",         label: "Hammer Curl",              unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },
  { id: "preacher_curl",       label: "Preacher Curl",            unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },
  { id: "concentration_curl",  label: "Concentration Curl",       unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },
  { id: "cable_curl",          label: "Cable Curl",               unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },
  { id: "incline_curl",        label: "Incline Dumbbell Curl",    unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },
  { id: "reverse_curl",        label: "Reverse Curl",             unit: "reps", muscles: ["biceps"],                       category: "Arms", strava: "CURL_GENERIC" },

  // ── ARMS: TRICEPS ──
  { id: "tricep_pushdown",     label: "Tricep Pushdown",          unit: "reps", muscles: ["triceps"],                      category: "Arms", strava: "TRICEPS_EXTENSION_GENERIC" },
  { id: "tricep_ext",          label: "Overhead Tricep Extension", unit: "reps", muscles: ["triceps"],                     category: "Arms", strava: "TRICEPS_EXTENSION_GENERIC" },
  { id: "skull_crusher",       label: "Skull Crusher",            unit: "reps", muscles: ["triceps"],                      category: "Arms", strava: "TRICEPS_EXTENSION_GENERIC" },
  { id: "close_grip_bench",    label: "Close Grip Bench Press",   unit: "reps", muscles: ["triceps", "chest"],             category: "Arms", strava: "BENCH_PRESS_GENERIC" },
  { id: "bench_dip",           label: "Bench Dip",                unit: "reps", muscles: ["triceps"],                      category: "Arms", strava: "TRICEPS_EXTENSION_GENERIC" },
  { id: "kickback",            label: "Tricep Kickback",          unit: "reps", muscles: ["triceps"],                      category: "Arms", strava: "TRICEPS_EXTENSION_GENERIC" },

  // ── CORE ──
  { id: "plank",               label: "Plank",                    unit: "sec",  muscles: ["core"],                         category: "Core", strava: "PLANK_GENERIC" },
  { id: "side_plank",          label: "Side Plank",               unit: "sec",  muscles: ["core"],                         category: "Core", strava: "PLANK_GENERIC" },
  { id: "crunch",              label: "Crunch",                   unit: "reps", muscles: ["core"],                         category: "Core", strava: "CRUNCH_GENERIC" },
  { id: "sit_up",              label: "Sit-up",                   unit: "reps", muscles: ["core"],                         category: "Core", strava: "SIT_UP_GENERIC" },
  { id: "leg_raise",           label: "Leg Raise",                unit: "reps", muscles: ["core"],                         category: "Core", strava: "LEG_RAISE_GENERIC" },
  { id: "russian_twist",       label: "Russian Twist",            unit: "reps", muscles: ["core"],                         category: "Core", strava: "CORE_GENERIC" },
  { id: "mountain_climber",    label: "Mountain Climber",         unit: "reps", muscles: ["core", "shoulders"],            category: "Core", strava: "CORE_GENERIC" },
  { id: "bicycle_crunch",      label: "Bicycle Crunch",           unit: "reps", muscles: ["core"],                         category: "Core", strava: "CRUNCH_GENERIC" },
  { id: "hollow_hold",         label: "Hollow Hold",              unit: "sec",  muscles: ["core"],                         category: "Core", strava: "PLANK_GENERIC" },
  { id: "ab_wheel",            label: "Ab Wheel Rollout",         unit: "reps", muscles: ["core", "shoulders"],            category: "Core", strava: "CORE_GENERIC" },
  { id: "toes_to_bar",         label: "Toes to Bar",              unit: "reps", muscles: ["core", "back"],                 category: "Core", strava: "LEG_RAISE_GENERIC" },
  { id: "cable_crunch",        label: "Cable Crunch",             unit: "reps", muscles: ["core"],                         category: "Core", strava: "CRUNCH_GENERIC" },
  { id: "dragon_flag",         label: "Dragon Flag",              unit: "reps", muscles: ["core"],                         category: "Core", strava: "CORE_GENERIC" },
  { id: "dead_bug",            label: "Dead Bug",                 unit: "reps", muscles: ["core"],                         category: "Core", strava: "CORE_GENERIC" },

  // ── LEGS ──
  { id: "squat",               label: "Squat",                    unit: "reps", muscles: ["quads", "glutes", "hamstrings"], category: "Legs", strava: "SQUAT_GENERIC" },
  { id: "goblet_squat",        label: "Goblet Squat",             unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "SQUAT_GENERIC" },
  { id: "front_squat",         label: "Front Squat",              unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "SQUAT_GENERIC" },
  { id: "bulgarian_split",     label: "Bulgarian Split Squat",    unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "LUNGE_GENERIC" },
  { id: "lunge",               label: "Lunge",                    unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "LUNGE_GENERIC" },
  { id: "step_up",             label: "Step Up",                  unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "LUNGE_GENERIC" },
  { id: "leg_press",           label: "Leg Press",                unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "SQUAT_GENERIC" },
  { id: "leg_extension",       label: "Leg Extension",            unit: "reps", muscles: ["quads"],                        category: "Legs", strava: "SQUAT_GENERIC" },
  { id: "leg_curl",            label: "Leg Curl",                 unit: "reps", muscles: ["hamstrings"],                   category: "Legs", strava: "LEG_CURL_GENERIC" },
  { id: "nordic_curl",         label: "Nordic Curl",              unit: "reps", muscles: ["hamstrings"],                   category: "Legs", strava: "LEG_CURL_GENERIC" },
  { id: "hip_thrust",          label: "Hip Thrust",               unit: "reps", muscles: ["glutes", "hamstrings"],         category: "Legs", strava: "HIP_RAISE_GENERIC" },
  { id: "glute_bridge",        label: "Glute Bridge",             unit: "reps", muscles: ["glutes", "hamstrings"],         category: "Legs", strava: "HIP_RAISE_GENERIC" },
  { id: "calf_raise",          label: "Calf Raise",               unit: "reps", muscles: ["calves"],                      category: "Legs", strava: "CALF_RAISE_GENERIC" },
  { id: "wall_sit",            label: "Wall Sit",                 unit: "sec",  muscles: ["quads"],                        category: "Legs", strava: "SQUAT_GENERIC" },
  { id: "box_jump",            label: "Box Jump",                 unit: "reps", muscles: ["quads", "glutes"],              category: "Legs", strava: "PLYO_GENERIC" },

  // ── FULL BODY / COMPOUND ──
  { id: "clean",               label: "Power Clean",              unit: "reps", muscles: ["back", "shoulders", "quads"],   category: "Full Body", strava: "OLYMPIC_LIFT_GENERIC" },
  { id: "thruster",            label: "Thruster",                 unit: "reps", muscles: ["quads", "shoulders", "core"],   category: "Full Body", strava: "OLYMPIC_LIFT_GENERIC" },
  { id: "burpee",              label: "Burpee",                   unit: "reps", muscles: ["chest", "core", "quads"],       category: "Full Body", strava: "PLYO_GENERIC" },
  { id: "turkish_getup",       label: "Turkish Get-Up",           unit: "reps", muscles: ["shoulders", "core"],            category: "Full Body", strava: "TOTAL_BODY_GENERIC" },
  { id: "kettlebell_swing",    label: "Kettlebell Swing",         unit: "reps", muscles: ["glutes", "hamstrings", "back"], category: "Full Body", strava: "HIP_SWING_GENERIC" },
  { id: "clean_and_press",     label: "Clean and Press",          unit: "reps", muscles: ["shoulders", "back", "quads"],   category: "Full Body", strava: "OLYMPIC_LIFT_GENERIC" },
  { id: "farmers_carry",       label: "Farmer's Carry",           unit: "sec",  muscles: ["core", "back", "shoulders"],    category: "Full Body", strava: "CARRY_GENERIC" },
];

// Group by category for dropdown display
export const EXERCISE_CATEGORIES = [...new Set(EXERCISE_LIBRARY.map(e => e.category))];

export function getExercisesByCategory(category) {
  return EXERCISE_LIBRARY.filter(e => e.category === category);
}

// All unique muscle IDs referenced in the library
export const ALL_MUSCLE_IDS = [...new Set(EXERCISE_LIBRARY.flatMap(e => e.muscles))];

// Extra muscle groups needed for legs etc that aren't in the built-in set
export const EXTENDED_MUSCLE_GROUPS = {
  quads:      { label: "Quads",      emoji: "🦵", color: "#7c3aed", lightBg: "#faf5ff", border: "#e9d5ff" },
  hamstrings: { label: "Hamstrings", emoji: "🦵", color: "#6d28d9", lightBg: "#f5f3ff", border: "#ddd6fe" },
  glutes:     { label: "Glutes",     emoji: "🍑", color: "#db2777", lightBg: "#fdf2f8", border: "#fbcfe8" },
  calves:     { label: "Calves",     emoji: "🦶", color: "#0891b2", lightBg: "#ecfeff", border: "#a5f3fc" },
};

// Fallback Strava exercise_type by primary muscle group, used for custom
// (user-defined) exercises that don't carry their own `strava` field.
export const MUSCLE_GROUP_STRAVA_FALLBACK = {
  chest:      "BENCH_PRESS_GENERIC",
  back:       "ROW_GENERIC",
  shoulders:  "SHOULDER_PRESS_GENERIC",
  biceps:     "CURL_GENERIC",
  triceps:    "TRICEPS_EXTENSION_GENERIC",
  core:       "CORE_GENERIC",
  quads:      "SQUAT_GENERIC",
  hamstrings: "LEG_CURL_GENERIC",
  glutes:     "HIP_RAISE_GENERIC",
  calves:     "CALF_RAISE_GENERIC",
};

// Resolve the Strava exercise_type for an exercise object, falling back to
// its primary muscle group, then a generic total-body placeholder.
export function getStravaExerciseType(exercise) {
  if (exercise?.strava) return exercise.strava;
  const primary = exercise?.muscles?.[0];
  return MUSCLE_GROUP_STRAVA_FALLBACK[primary] || "TOTAL_BODY_GENERIC";
}

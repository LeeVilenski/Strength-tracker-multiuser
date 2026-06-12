// ---------------------------------------------------------------------------
// Maps EXERCISE_LIBRARY ids to Garmin FIT SDK exercise category/name enums.
// Used to populate "set" messages (mesgNum 225) so Strava's Strength Training
// UI can show a named exercise per set. Exercises with no good Garmin
// equivalent are simply omitted - their sets still upload with reps/weight,
// just without a category/name.
// ---------------------------------------------------------------------------

export const EXERCISE_FIT_MAP = {
  // Chest
  bench_press:         { category: "benchPress",        name: "barbellBenchPress" },
  incline_bench_press: { category: "benchPress",        name: "inclineBarbellBenchPress" },
  decline_bench_press: { category: "benchPress",        name: "declineDumbbellBenchPress" },
  pushup:              { category: "pushUp",            name: "pushUp" },
  incline_pushup:      { category: "pushUp",            name: "inclinePushUp" },
  decline_pushup:      { category: "pushUp",            name: "declinePushUp" },
  diamond_pushup:      { category: "pushUp",            name: "diamondPushUp" },
  chest_fly:           { category: "flye",              name: "dumbbellFlye" },
  cable_crossover:     { category: "flye",              name: "cableCrossover" },
  dip:                 { category: "tricepsExtension",  name: "bodyWeightDip" },
  chest_press_machine: { category: "benchPress",        name: "smithMachineBenchPress" },

  // Back
  pullup:              { category: "pullUp",            name: "pullUp" },
  chinup:              { category: "pullUp",            name: "chinUp" },
  lat_pulldown:        { category: "pullUp",            name: "latPulldown" },
  seated_row:          { category: "row",               name: "seatedCableRow" },
  bent_over_row:       { category: "row",               name: "bentOverRowWithBarbell" },
  t_bar_row:           { category: "row",               name: "tBarRow" },
  inverted_row:        { category: "row",               name: "invertedRow" },
  single_arm_row:      { category: "row",               name: "dumbbellRow" },
  deadlift:            { category: "deadlift",          name: "barbellDeadlift" },
  romanian_deadlift:   { category: "deadlift",          name: "romanianDeadlift" },
  good_morning:        { category: "legCurl",           name: "goodMorning" },
  face_pull:           { category: "row",               name: "facePull" },
  back_extension:      { category: "hyperextension",    name: "staticBackExtension" },
  // dead_hang: no good Garmin equivalent - left unmapped

  // Shoulders
  overhead_press:      { category: "shoulderPress",     name: "overheadBarbellPress" },
  shoulder_press:      { category: "shoulderPress",     name: "dumbbellShoulderPress" },
  arnold_press:        { category: "shoulderPress",     name: "arnoldPress" },
  lateral_raise:       { category: "lateralRaise",      name: "dumbbellLateralRaise" },
  front_raise:         { category: "lateralRaise",      name: "frontRaise" },
  reverse_fly:         { category: "flye",              name: "inclineReverseFlye" },
  upright_row:         { category: "shrug",             name: "barbellUprightRow" },
  pike_pushup:         { category: "pushUp",            name: "pikePushUp" },
  handstand_pushup:    { category: "pushUp",            name: "handstandPushUp" },
  shrug:               { category: "shrug",             name: "barbellShrug" },

  // Arms: biceps
  bicep_curl:          { category: "curl",              name: "dumbbellBicepsCurl" },
  hammer_curl:         { category: "curl",              name: "dumbbellHammerCurl" },
  preacher_curl:       { category: "curl",              name: "ezBarPreacherCurl" },
  concentration_curl:  { category: "curl",              name: "oneArmConcentrationCurl" },
  cable_curl:          { category: "curl",              name: "cableBicepsCurl" },
  incline_curl:        { category: "curl",              name: "inclineDumbbellBicepsCurl" },
  reverse_curl:        { category: "curl",              name: "reverseEzBarCurl" },

  // Arms: triceps
  tricep_pushdown:     { category: "tricepsExtension",  name: "tricepsPressdown" },
  tricep_ext:          { category: "tricepsExtension",  name: "overheadDumbbellTricepsExtension" },
  skull_crusher:       { category: "tricepsExtension",  name: "lyingEzBarTricepsExtension" },
  close_grip_bench:    { category: "benchPress",        name: "closeGripBarbellBenchPress" },
  bench_dip:           { category: "tricepsExtension",  name: "benchDip" },
  kickback:            { category: "tricepsExtension",  name: "dumbbellKickback" },

  // Core
  plank:               { category: "plank",             name: "plank" },
  side_plank:          { category: "plank",             name: "sidePlank" },
  crunch:              { category: "crunch",            name: "crunch" },
  sit_up:              { category: "sitUp",             name: "sitUp" },
  leg_raise:           { category: "legRaise",          name: "hangingLegRaise" },
  russian_twist:       { category: "core",              name: "russianTwist" },
  mountain_climber:    { category: "plank",             name: "mountainClimber" },
  bicycle_crunch:      { category: "crunch",            name: "bicycleCrunch" },
  hollow_hold:         { category: "core",              name: "hollowRock" },
  ab_wheel:            { category: "core",              name: "kneelingAbWheel" },
  toes_to_bar:         { category: "crunch",            name: "toesToBar" },
  cable_crunch:        { category: "crunch",            name: "cableCrunch" },
  dragon_flag:         { category: "core",              name: "modifiedFrontLever" },
  dead_bug:            { category: "hipStability",      name: "deadBug" },

  // Legs
  squat:               { category: "squat",             name: "barbellBackSquat" },
  goblet_squat:        { category: "squat",             name: "gobletSquat" },
  front_squat:         { category: "squat",             name: "barbellFrontSquat" },
  bulgarian_split:     { category: "lunge",             name: "barbellBulgarianSplitSquat" },
  lunge:               { category: "lunge",             name: "lunge" },
  step_up:             { category: "squat",             name: "stepUp" },
  leg_press:           { category: "squat",             name: "legPress" },
  // leg_extension: no good Garmin equivalent - left unmapped
  leg_curl:            { category: "legCurl",           name: "legCurl" },
  nordic_curl:         { category: "legCurl",           name: "legCurl" },
  hip_thrust:          { category: "hipRaise",          name: "barbellHipThrustOnFloor" },
  glute_bridge:        { category: "hipRaise",          name: "hipRaise" },
  calf_raise:          { category: "calfRaise",         name: "standingCalfRaise" },
  wall_sit:            { category: "squat",             name: "bodyWeightWallSquat" },
  box_jump:            { category: "plyo",              name: "boxJump" },

  // Full body / compound
  clean:               { category: "olympicLift",       name: "barbellPowerClean" },
  thruster:            { category: "squat",             name: "thrusters" },
  burpee:              { category: "totalBody",         name: "burpee" },
  turkish_getup:       { category: "core",              name: "turkishGetUp" },
  kettlebell_swing:    { category: "hipRaise",          name: "kettlebellSwing" },
  clean_and_press:     { category: "olympicLift",       name: "cleanAndPress" },
  farmers_carry:       { category: "carry",             name: "farmersCarry" },
};

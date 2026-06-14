import { summariseSets, CHALLENGE_BONUS_XP, BODY_GROUP } from "./game";

const BLOCK_START = "--- Strength Tracker (auto) ---";
const BLOCK_END = "--- End Strength Tracker ---";

// Build the auto-generated exercise breakdown block for a session's notes,
// or null if there's nothing worth writing back to Strava.
// `extras.xpGain` (optional) is the enriched { totalXp, levelUps, bodyLevelUp }
// from diffMuscleStats, with levelUps/bodyLevelUp carrying `label`/`emoji`.
// `extras.appUrl` (optional) is the app's public URL, appended as a footer link.
export function buildExerciseBlock(notes, allExercises, extras = {}) {
  const lines = [];
  for (const [exId, value] of Object.entries(notes?.exercises || {})) {
    const summary = summariseSets(value);
    if (!summary) continue;
    const ex = allExercises.find(e => e.id === exId);
    lines.push(`${ex?.label || exId}: ${summary}`);
  }
  if (lines.length === 0) return null;

  const { xpGain, appUrl, challengeCompleted } = extras;
  if (xpGain && (xpGain.totalXp > 0 || xpGain.levelUps?.length > 0 || xpGain.bodyLevelUp)) {
    lines.push("");
    if (xpGain.totalXp > 0) lines.push(`⚡ +${xpGain.totalXp} XP earned this session`);
    for (const lu of xpGain.levelUps || []) {
      lines.push(`${lu.emoji} ${lu.label} levelled up → Lv ${lu.toLevel}!`);
    }
    if (xpGain.bodyLevelUp) {
      lines.push(`${xpGain.bodyLevelUp.emoji} ${xpGain.bodyLevelUp.label} levelled up → Lv ${xpGain.bodyLevelUp.toLevel}!`);
    }
  }

  if (challengeCompleted) {
    lines.push("");
    lines.push(`🏆 Challenge complete! +${CHALLENGE_BONUS_XP} ${BODY_GROUP.label} XP ${BODY_GROUP.emoji}`);
    lines.push(`${challengeCompleted.emoji} ${challengeCompleted.title}`);
  }

  if (appUrl) {
    lines.push("");
    lines.push("🤖 Tracked with Ed's Strength Tracker");
    lines.push(appUrl);
  }

  return [BLOCK_START, ...lines, BLOCK_END].join("\n");
}

// Replace any previously-written auto-generated block in `description` with
// `newBlock`, preserving the rest of the description. If `newBlock` is null,
// the block is simply removed.
export function mergeDescription(description, newBlock) {
  const escaped = [BLOCK_START, BLOCK_END].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const blockPattern = new RegExp(`\\n*${escaped[0]}[\\s\\S]*?${escaped[1]}\\n*`, "g");
  const stripped = (description || "").replace(blockPattern, "").trim();
  if (!newBlock) return stripped;
  return stripped ? `${stripped}\n\n${newBlock}` : newBlock;
}

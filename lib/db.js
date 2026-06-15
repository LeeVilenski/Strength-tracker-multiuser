import postgres from "postgres";

// Use POSTGRES_URL_NON_POOLING for direct connections (DDL, transactions)
// or POSTGRES_URL which is the pooled one - we'll try both
const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const sql = postgres(connectionString, { ssl: "require", max: 1 });

// ---------------------------------------------------------------------------
// DB setup — call once on first deploy (hit /api/setup)
// ---------------------------------------------------------------------------
export async function setupDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      athlete_id BIGINT PRIMARY KEY,
      access_token TEXT,
      refresh_token TEXT,
      expires_at BIGINT,
      first_name TEXT,
      last_name TEXT,
      profile_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS exercise_notes (
      athlete_id BIGINT NOT NULL,
      activity_id TEXT NOT NULL,
      notes_json TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (athlete_id, activity_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_muscle_groups (
      athlete_id BIGINT NOT NULL,
      id TEXT NOT NULL,
      label TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      light_bg TEXT NOT NULL,
      border TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (athlete_id, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_exercises (
      athlete_id BIGINT NOT NULL,
      id TEXT NOT NULL,
      label TEXT NOT NULL,
      unit TEXT NOT NULL,
      muscles_json TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (athlete_id, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS workout_drafts (
      athlete_id BIGINT NOT NULL,
      id TEXT NOT NULL,
      title TEXT NOT NULL,
      exercises_json TEXT NOT NULL,
      session_notes TEXT DEFAULT '',
      is_template BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (athlete_id, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activities_cache (
      athlete_id BIGINT NOT NULL,
      id BIGINT NOT NULL,
      name TEXT NOT NULL,
      sport_type TEXT NOT NULL,
      date TEXT NOT NULL,
      distance FLOAT DEFAULT 0,
      duration INTEGER DEFAULT 0,
      calories INTEGER DEFAULT 0,
      effort INTEGER DEFAULT 0,
      avg_hr FLOAT,
      max_hr FLOAT,
      elevation FLOAT DEFAULT 0,
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      best_efforts_synced_at TIMESTAMPTZ,
      PRIMARY KEY (athlete_id, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS best_efforts_cache (
      athlete_id BIGINT NOT NULL,
      activity_id BIGINT NOT NULL,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL,
      distance FLOAT NOT NULL,
      moving_time INTEGER NOT NULL,
      PRIMARY KEY (athlete_id, activity_id, name)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS best_efforts_name_key_idx ON best_efforts_cache (athlete_id, name_key)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS monthly_challenges (
      athlete_id BIGINT NOT NULL,
      month_key TEXT NOT NULL,
      challenge_json TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      bonus_xp INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (athlete_id, month_key)
    )
  `;
}

// ---------------------------------------------------------------------------
// Activities cache
// ---------------------------------------------------------------------------
export async function getCachedActivities(athleteId) {
  const rows = await sql`
    SELECT * FROM activities_cache WHERE athlete_id = ${athleteId} ORDER BY date DESC
  `;
  return rows.map(r => ({
    id: String(r.id),
    name: r.name,
    sport_type: r.sport_type,
    date: r.date,
    distance: r.distance,
    duration: r.duration,
    calories: r.calories,
    effort: r.effort,
    avg_hr: r.avg_hr,
    max_hr: r.max_hr,
    elevation: r.elevation,
  }));
}

export async function getMostRecentCachedDate(athleteId) {
  const rows = await sql`
    SELECT date FROM activities_cache WHERE athlete_id = ${athleteId} ORDER BY date DESC LIMIT 1
  `;
  return rows[0]?.date || null;
}

export async function upsertActivities(athleteId, activities) {
  if (!activities.length) return;
  // Insert in batches of 50
  for (let i = 0; i < activities.length; i += 50) {
    const batch = activities.slice(i, i + 50);
    for (const a of batch) {
      await sql`
        INSERT INTO activities_cache (athlete_id, id, name, sport_type, date, distance, duration, calories, effort, avg_hr, max_hr, elevation)
        VALUES (${athleteId}, ${BigInt(a.id)}, ${a.name}, ${a.sport_type}, ${a.date}, ${a.distance}, ${a.duration}, ${a.calories}, ${a.effort}, ${a.avg_hr}, ${a.max_hr}, ${a.elevation})
        ON CONFLICT (athlete_id, id) DO UPDATE SET
          name = EXCLUDED.name,
          calories = EXCLUDED.calories,
          effort = EXCLUDED.effort
      `;
    }
  }
}

export async function getCacheCount(athleteId) {
  const rows = await sql`SELECT COUNT(*) as count FROM activities_cache WHERE athlete_id = ${athleteId}`;
  return parseInt(rows[0].count);
}

export async function renameCachedActivity(athleteId, id, name) {
  await sql`UPDATE activities_cache SET name = ${name} WHERE athlete_id = ${athleteId} AND id = ${BigInt(id)}`;
}

// Remove a cached activity (e.g. one deleted on Strava directly) along with
// any best-effort splits and exercise notes attached to it.
export async function deleteCachedActivity(athleteId, id) {
  await sql`DELETE FROM activities_cache WHERE athlete_id = ${athleteId} AND id = ${BigInt(id)}`;
  await sql`DELETE FROM best_efforts_cache WHERE athlete_id = ${athleteId} AND activity_id = ${BigInt(id)}`;
  await sql`DELETE FROM exercise_notes WHERE athlete_id = ${athleteId} AND activity_id = ${String(id)}`;
}

// ---------------------------------------------------------------------------
// Best efforts cache (PR splits within runs, e.g. fastest 5K-within-a-run)
// ---------------------------------------------------------------------------
export function normalizeEffortName(s) {
  return String(s || "").toLowerCase().replace(/[\s-]/g, "");
}

export async function getUnsyncedRunIds(athleteId, limit) {
  const rows = await sql`
    SELECT id, sport_type FROM activities_cache
    WHERE athlete_id = ${athleteId} AND best_efforts_synced_at IS NULL
    ORDER BY date DESC
  `;
  return rows.filter(r => isRun(r.sport_type)).slice(0, limit).map(r => String(r.id));
}

export async function countUnsyncedRuns(athleteId) {
  const rows = await sql`
    SELECT sport_type FROM activities_cache
    WHERE athlete_id = ${athleteId} AND best_efforts_synced_at IS NULL
  `;
  return rows.filter(r => isRun(r.sport_type)).length;
}

export async function saveBestEfforts(athleteId, activityId, efforts) {
  await sql`DELETE FROM best_efforts_cache WHERE athlete_id = ${athleteId} AND activity_id = ${BigInt(activityId)}`;
  for (const e of efforts) {
    await sql`
      INSERT INTO best_efforts_cache (athlete_id, activity_id, name, name_key, distance, moving_time)
      VALUES (${athleteId}, ${BigInt(activityId)}, ${e.name}, ${normalizeEffortName(e.name)}, ${e.distance}, ${e.moving_time})
    `;
  }
  await sql`UPDATE activities_cache SET best_efforts_synced_at = NOW() WHERE athlete_id = ${athleteId} AND id = ${BigInt(activityId)}`;
}

export async function getTopBestEfforts(athleteId, nameKey, limit = 15) {
  const rows = await sql`
    SELECT be.activity_id, be.distance, be.moving_time, a.date, a.name AS activity_name, a.distance AS activity_distance
    FROM best_efforts_cache be
    JOIN activities_cache a ON a.athlete_id = be.athlete_id AND a.id = be.activity_id
    WHERE be.athlete_id = ${athleteId} AND be.name_key = ${nameKey}
    ORDER BY be.moving_time ASC
    LIMIT ${limit}
  `;
  return rows.map(r => ({
    activityId: String(r.activity_id),
    distance: r.distance,
    movingTime: r.moving_time,
    date: r.date,
    activityName: r.activity_name,
    activityDistance: r.activity_distance,
  }));
}

export async function backfillBestEfforts(athleteId, limit = 3) {
  const ids = await getUnsyncedRunIds(athleteId, limit);
  for (const id of ids) {
    try {
      const detail = await getStravaActivity(athleteId, id);
      const efforts = (detail.best_efforts || []).map(e => ({
        name: e.name,
        distance: e.distance,
        moving_time: e.moving_time,
      }));
      await saveBestEfforts(athleteId, id, efforts);
    } catch (e) {
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Custom muscle groups
// ---------------------------------------------------------------------------
export async function getCustomMuscleGroups(athleteId) {
  const rows = await sql`SELECT * FROM custom_muscle_groups WHERE athlete_id = ${athleteId} ORDER BY created_at`;
  return rows.map(r => ({
    id: r.id, label: r.label, emoji: r.emoji,
    color: r.color, lightBg: r.light_bg, border: r.border,
  }));
}

export async function saveCustomMuscleGroup(athleteId, mg) {
  await sql`
    INSERT INTO custom_muscle_groups (athlete_id, id, label, emoji, color, light_bg, border)
    VALUES (${athleteId}, ${mg.id}, ${mg.label}, ${mg.emoji}, ${mg.color}, ${mg.lightBg}, ${mg.border})
    ON CONFLICT (athlete_id, id) DO UPDATE SET label=EXCLUDED.label, emoji=EXCLUDED.emoji,
      color=EXCLUDED.color, light_bg=EXCLUDED.light_bg, border=EXCLUDED.border
  `;
}

export async function deleteCustomMuscleGroup(athleteId, id) {
  await sql`DELETE FROM custom_muscle_groups WHERE athlete_id = ${athleteId} AND id = ${id}`;
}

// ---------------------------------------------------------------------------
// Custom exercises
// ---------------------------------------------------------------------------
export async function getCustomExercises(athleteId) {
  const rows = await sql`SELECT * FROM custom_exercises WHERE athlete_id = ${athleteId} ORDER BY created_at`;
  return rows.map(r => ({
    id: r.id, label: r.label, unit: r.unit,
    muscles: JSON.parse(r.muscles_json),
  }));
}

export async function saveCustomExercise(athleteId, ex) {
  await sql`
    INSERT INTO custom_exercises (athlete_id, id, label, unit, muscles_json)
    VALUES (${athleteId}, ${ex.id}, ${ex.label}, ${ex.unit}, ${JSON.stringify(ex.muscles)})
    ON CONFLICT (athlete_id, id) DO UPDATE SET label=EXCLUDED.label, unit=EXCLUDED.unit, muscles_json=EXCLUDED.muscles_json
  `;
}

export async function deleteCustomExercise(athleteId, id) {
  await sql`DELETE FROM custom_exercises WHERE athlete_id = ${athleteId} AND id = ${id}`;
}

// ---------------------------------------------------------------------------
// Monthly challenges — persisted so a month's challenge doesn't shift as
// live stats change, plus a record of how past challenges went.
// ---------------------------------------------------------------------------
export async function getMonthlyChallenges(athleteId) {
  const rows = await sql`SELECT * FROM monthly_challenges WHERE athlete_id = ${athleteId} ORDER BY month_key DESC`;
  return rows.map(r => ({
    monthKey: r.month_key,
    challenge: JSON.parse(r.challenge_json),
    completed: r.completed,
    bonusXp: r.bonus_xp,
    completedAt: r.completed ? new Date(r.updated_at).toISOString().slice(0, 10) : null,
  }));
}

export async function saveMonthlyChallenge(athleteId, monthKey, challenge) {
  await sql`
    INSERT INTO monthly_challenges (athlete_id, month_key, challenge_json)
    VALUES (${athleteId}, ${monthKey}, ${JSON.stringify(challenge)})
    ON CONFLICT (athlete_id, month_key) DO NOTHING
  `;
}

export async function completeMonthlyChallenge(athleteId, monthKey, bonusXp) {
  await sql`
    UPDATE monthly_challenges
    SET completed = TRUE, bonus_xp = ${bonusXp}, updated_at = NOW()
    WHERE athlete_id = ${athleteId} AND month_key = ${monthKey} AND completed = FALSE
  `;
}

// ---------------------------------------------------------------------------
// Workout drafts / templates
// ---------------------------------------------------------------------------
export async function getWorkoutDrafts(athleteId) {
  const rows = await sql`SELECT * FROM workout_drafts WHERE athlete_id = ${athleteId} ORDER BY is_template ASC, updated_at DESC`;
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    exercises: JSON.parse(r.exercises_json),
    sessionNotes: r.session_notes || "",
    isTemplate: r.is_template,
  }));
}

export async function saveWorkoutDraft(athleteId, draft) {
  await sql`
    INSERT INTO workout_drafts (athlete_id, id, title, exercises_json, session_notes, is_template, updated_at)
    VALUES (${athleteId}, ${draft.id}, ${draft.title}, ${JSON.stringify(draft.exercises || {})}, ${draft.sessionNotes || ""}, ${!!draft.isTemplate}, NOW())
    ON CONFLICT (athlete_id, id) DO UPDATE SET
      title = EXCLUDED.title,
      exercises_json = EXCLUDED.exercises_json,
      session_notes = EXCLUDED.session_notes,
      is_template = EXCLUDED.is_template,
      updated_at = NOW()
  `;
}

export async function deleteWorkoutDraft(athleteId, id) {
  await sql`DELETE FROM workout_drafts WHERE athlete_id = ${athleteId} AND id = ${id}`;
}

// ---------------------------------------------------------------------------
// User / token management
// ---------------------------------------------------------------------------
export async function getStoredTokens(athleteId) {
  const rows = await sql`SELECT * FROM users WHERE athlete_id = ${athleteId}`;
  return rows[0] || null;
}

// Called from the OAuth callback with the full Strava athlete profile.
export async function upsertUser({ athlete_id, access_token, refresh_token, expires_at, first_name, last_name, profile_url }) {
  await sql`
    INSERT INTO users (athlete_id, access_token, refresh_token, expires_at, first_name, last_name, profile_url, updated_at)
    VALUES (${athlete_id}, ${access_token}, ${refresh_token}, ${expires_at}, ${first_name}, ${last_name}, ${profile_url}, NOW())
    ON CONFLICT (athlete_id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      profile_url = EXCLUDED.profile_url,
      updated_at = NOW()
  `;
}

// All accounts that have connected via Strava OAuth, with a rough usage
// signal (cached activity count) for the admin "connected accounts" view.
export async function getAllUsers() {
  const rows = await sql`
    SELECT u.athlete_id, u.first_name, u.last_name, u.profile_url, u.created_at, u.updated_at,
      (SELECT COUNT(*) FROM activities_cache a WHERE a.athlete_id = u.athlete_id) AS activity_count
    FROM users u
    ORDER BY u.created_at DESC
  `;
  return rows.map(r => ({
    athleteId: String(r.athlete_id),
    firstName: r.first_name,
    lastName: r.last_name,
    profileUrl: r.profile_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    activityCount: Number(r.activity_count),
  }));
}

// Persist refreshed tokens without touching the stored profile fields.
async function updateUserTokens(athleteId, { access_token, refresh_token, expires_at }) {
  await sql`
    UPDATE users SET
      access_token = ${access_token},
      refresh_token = ${refresh_token},
      expires_at = ${expires_at},
      updated_at = NOW()
    WHERE athlete_id = ${athleteId}
  `;
}

export async function getValidAccessToken(athleteId) {
  const tokens = await getStoredTokens(athleteId);
  if (!tokens) return null;

  const nowSecs = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > nowSecs + 300) {
    return tokens.access_token;
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();

  await updateUserTokens(athleteId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  });

  return data.access_token;
}

// Wipes everything this app has stored for an athlete (not their Strava
// account itself — they'd revoke that separately from Strava's settings).
export async function deleteUserData(athleteId) {
  await sql`DELETE FROM exercise_notes WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM custom_muscle_groups WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM custom_exercises WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM workout_drafts WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM activities_cache WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM best_efforts_cache WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM monthly_challenges WHERE athlete_id = ${athleteId}`;
  await sql`DELETE FROM users WHERE athlete_id = ${athleteId}`;
}

// ---------------------------------------------------------------------------
// Exercise notes
// ---------------------------------------------------------------------------
export async function getAllExerciseNotes(athleteId) {
  const rows = await sql`SELECT activity_id, notes_json FROM exercise_notes WHERE athlete_id = ${athleteId}`;
  const map = {};
  for (const row of rows) {
    map[row.activity_id] = JSON.parse(row.notes_json);
  }
  return map;
}

export async function saveExerciseNotes(athleteId, activityId, notes) {
  await sql`
    INSERT INTO exercise_notes (athlete_id, activity_id, notes_json, updated_at)
    VALUES (${athleteId}, ${activityId}, ${JSON.stringify(notes)}, NOW())
    ON CONFLICT (athlete_id, activity_id) DO UPDATE SET
      notes_json = EXCLUDED.notes_json,
      updated_at = NOW()
  `;
}

// ---------------------------------------------------------------------------
// Strava API helpers
// ---------------------------------------------------------------------------
const STRENGTH_TYPES = new Set([
  "WeightTraining", "Workout", "Crossfit",
  "HighIntensityIntervalTraining", "Yoga", "Pilates", "RockClimbing",
]);
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun", "Treadmill"]);

export function isStrength(sport_type) { return STRENGTH_TYPES.has(sport_type); }
export function isRun(sport_type) { return RUN_TYPES.has(sport_type); }

export async function fetchAllStravaActivities(accessToken) {
  const activities = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) break;
    const batch = await res.json();
    if (!batch.length) break;
    activities.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return activities;
}

export function shapeActivity(a) {
  return {
    id: String(a.id),
    name: a.name,
    sport_type: a.sport_type || a.type,
    date: a.start_date_local?.slice(0, 10),
    distance: a.distance || 0,
    duration: a.moving_time || 0,
    calories: a.calories || 0,
    effort: a.suffer_score || 0,
    avg_hr: a.average_heartrate || null,
    max_hr: a.max_heartrate || null,
    elevation: a.total_elevation_gain || 0,
  };
}

// Fetch full activity detail (includes `description`, not present on list endpoints)
export async function getStravaActivity(athleteId, activityId) {
  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) throw new Error("Not authenticated");
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status}`);
  return res.json();
}

// Update writable fields (name, description, ...) on an activity
export async function updateStravaActivityFields(athleteId, activityId, fields) {
  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) throw new Error("Not authenticated");
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
  if (!res.ok) throw new Error(`Strava activity update failed: ${res.status}`);
  return res.json();
}

// Update an activity's description (requires activity:write scope)
export async function updateStravaActivityDescription(athleteId, activityId, description) {
  return updateStravaActivityFields(athleteId, activityId, { description });
}

// Create a manual (no GPS file) activity on Strava (requires activity:write scope)
export async function createStravaActivity(athleteId, { name, sportType, startDateLocal, elapsedTime, description }) {
  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) throw new Error("Not authenticated");
  const res = await fetch("https://www.strava.com/api/v3/activities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      name,
      sport_type: sportType,
      type: sportType,
      start_date_local: startDateLocal,
      elapsed_time: String(elapsedTime),
      description: description || "",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Strava activity create failed: ${res.status}${body ? ` ${body}` : ""}`);
  }
  return res.json();
}

// Upload a FIT file as a new activity (requires activity:write scope)
export async function uploadStravaActivity(athleteId, { fitBuffer, name, sportType, description, externalId }) {
  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", new Blob([fitBuffer]), "workout.fit");
  form.append("data_type", "fit");
  form.append("name", name);
  form.append("sport_type", sportType);
  if (description) form.append("description", description);
  if (externalId) form.append("external_id", externalId);

  const res = await fetch("https://www.strava.com/api/v3/uploads", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Strava upload failed: ${res.status}${body ? ` ${body}` : ""}`);
  }
  return res.json();
}

// Poll an upload until Strava finishes processing it into an activity
export async function pollStravaUpload(athleteId, uploadId, { maxAttempts = 15, intervalMs = 1000 } = {}) {
  const accessToken = await getValidAccessToken(athleteId);
  if (!accessToken) throw new Error("Not authenticated");

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://www.strava.com/api/v3/uploads/${uploadId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Strava upload status check failed: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(`Strava upload error: ${data.error}`);
    if (data.activity_id) return data.activity_id;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error("Strava upload did not finish processing in time");
}

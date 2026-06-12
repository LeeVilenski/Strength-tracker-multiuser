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
    CREATE TABLE IF NOT EXISTS auth (
      id INTEGER PRIMARY KEY DEFAULT 1,
      athlete_id BIGINT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at BIGINT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS exercise_notes (
      activity_id TEXT PRIMARY KEY,
      notes_json TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Manual sessions use non-numeric ids ("manual_<timestamp>") — widen from
  // the original BIGINT-only column so their notes can be saved too.
  await sql`
    ALTER TABLE exercise_notes ALTER COLUMN activity_id TYPE TEXT USING activity_id::text
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_muscle_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      light_bg TEXT NOT NULL,
      border TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      unit TEXT NOT NULL,
      muscles_json TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS workout_drafts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      exercises_json TEXT NOT NULL,
      session_notes TEXT DEFAULT '',
      is_template BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activities_cache (
      id BIGINT PRIMARY KEY,
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
      synced_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE activities_cache ADD COLUMN IF NOT EXISTS best_efforts_synced_at TIMESTAMPTZ
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS best_efforts_cache (
      activity_id BIGINT NOT NULL,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL,
      distance FLOAT NOT NULL,
      moving_time INTEGER NOT NULL,
      PRIMARY KEY (activity_id, name)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS best_efforts_name_key_idx ON best_efforts_cache (name_key)
  `;
}

// ---------------------------------------------------------------------------
// Activities cache
// ---------------------------------------------------------------------------
export async function getCachedActivities() {
  const rows = await sql`
    SELECT * FROM activities_cache ORDER BY date DESC
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

export async function getMostRecentCachedDate() {
  const rows = await sql`
    SELECT date FROM activities_cache ORDER BY date DESC LIMIT 1
  `;
  return rows[0]?.date || null;
}

export async function upsertActivities(activities) {
  if (!activities.length) return;
  // Insert in batches of 50
  for (let i = 0; i < activities.length; i += 50) {
    const batch = activities.slice(i, i + 50);
    for (const a of batch) {
      await sql`
        INSERT INTO activities_cache (id, name, sport_type, date, distance, duration, calories, effort, avg_hr, max_hr, elevation)
        VALUES (${BigInt(a.id)}, ${a.name}, ${a.sport_type}, ${a.date}, ${a.distance}, ${a.duration}, ${a.calories}, ${a.effort}, ${a.avg_hr}, ${a.max_hr}, ${a.elevation})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          calories = EXCLUDED.calories,
          effort = EXCLUDED.effort
      `;
    }
  }
}

export async function getCacheCount() {
  const rows = await sql`SELECT COUNT(*) as count FROM activities_cache`;
  return parseInt(rows[0].count);
}

export async function renameCachedActivity(id, name) {
  await sql`UPDATE activities_cache SET name = ${name} WHERE id = ${BigInt(id)}`;
}

// ---------------------------------------------------------------------------
// Best efforts cache (PR splits within runs, e.g. fastest 5K-within-a-run)
// ---------------------------------------------------------------------------
export function normalizeEffortName(s) {
  return String(s || "").toLowerCase().replace(/[\s-]/g, "");
}

export async function getUnsyncedRunIds(limit) {
  const rows = await sql`
    SELECT id, sport_type FROM activities_cache
    WHERE best_efforts_synced_at IS NULL
    ORDER BY date DESC
  `;
  return rows.filter(r => isRun(r.sport_type)).slice(0, limit).map(r => String(r.id));
}

export async function countUnsyncedRuns() {
  const rows = await sql`
    SELECT sport_type FROM activities_cache
    WHERE best_efforts_synced_at IS NULL
  `;
  return rows.filter(r => isRun(r.sport_type)).length;
}

export async function saveBestEfforts(activityId, efforts) {
  await sql`DELETE FROM best_efforts_cache WHERE activity_id = ${BigInt(activityId)}`;
  for (const e of efforts) {
    await sql`
      INSERT INTO best_efforts_cache (activity_id, name, name_key, distance, moving_time)
      VALUES (${BigInt(activityId)}, ${e.name}, ${normalizeEffortName(e.name)}, ${e.distance}, ${e.moving_time})
    `;
  }
  await sql`UPDATE activities_cache SET best_efforts_synced_at = NOW() WHERE id = ${BigInt(activityId)}`;
}

export async function getTopBestEfforts(nameKey, limit = 15) {
  const rows = await sql`
    SELECT be.activity_id, be.distance, be.moving_time, a.date, a.name AS activity_name, a.distance AS activity_distance
    FROM best_efforts_cache be
    JOIN activities_cache a ON a.id = be.activity_id
    WHERE be.name_key = ${nameKey}
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

export async function backfillBestEfforts(limit = 3) {
  const ids = await getUnsyncedRunIds(limit);
  for (const id of ids) {
    try {
      const detail = await getStravaActivity(id);
      const efforts = (detail.best_efforts || []).map(e => ({
        name: e.name,
        distance: e.distance,
        moving_time: e.moving_time,
      }));
      await saveBestEfforts(id, efforts);
    } catch (e) {
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Custom muscle groups
// ---------------------------------------------------------------------------
export async function getCustomMuscleGroups() {
  const rows = await sql`SELECT * FROM custom_muscle_groups ORDER BY created_at`;
  return rows.map(r => ({
    id: r.id, label: r.label, emoji: r.emoji,
    color: r.color, lightBg: r.light_bg, border: r.border,
  }));
}

export async function saveCustomMuscleGroup(mg) {
  await sql`
    INSERT INTO custom_muscle_groups (id, label, emoji, color, light_bg, border)
    VALUES (${mg.id}, ${mg.label}, ${mg.emoji}, ${mg.color}, ${mg.lightBg}, ${mg.border})
    ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, emoji=EXCLUDED.emoji,
      color=EXCLUDED.color, light_bg=EXCLUDED.light_bg, border=EXCLUDED.border
  `;
}

export async function deleteCustomMuscleGroup(id) {
  await sql`DELETE FROM custom_muscle_groups WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// Custom exercises
// ---------------------------------------------------------------------------
export async function getCustomExercises() {
  const rows = await sql`SELECT * FROM custom_exercises ORDER BY created_at`;
  return rows.map(r => ({
    id: r.id, label: r.label, unit: r.unit,
    muscles: JSON.parse(r.muscles_json),
  }));
}

export async function saveCustomExercise(ex) {
  await sql`
    INSERT INTO custom_exercises (id, label, unit, muscles_json)
    VALUES (${ex.id}, ${ex.label}, ${ex.unit}, ${JSON.stringify(ex.muscles)})
    ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, unit=EXCLUDED.unit, muscles_json=EXCLUDED.muscles_json
  `;
}

export async function deleteCustomExercise(id) {
  await sql`DELETE FROM custom_exercises WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// Workout drafts / templates
// ---------------------------------------------------------------------------
export async function getWorkoutDrafts() {
  const rows = await sql`SELECT * FROM workout_drafts ORDER BY is_template ASC, updated_at DESC`;
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    exercises: JSON.parse(r.exercises_json),
    sessionNotes: r.session_notes || "",
    isTemplate: r.is_template,
  }));
}

export async function saveWorkoutDraft(draft) {
  await sql`
    INSERT INTO workout_drafts (id, title, exercises_json, session_notes, is_template, updated_at)
    VALUES (${draft.id}, ${draft.title}, ${JSON.stringify(draft.exercises || {})}, ${draft.sessionNotes || ""}, ${!!draft.isTemplate}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      exercises_json = EXCLUDED.exercises_json,
      session_notes = EXCLUDED.session_notes,
      is_template = EXCLUDED.is_template,
      updated_at = NOW()
  `;
}

export async function deleteWorkoutDraft(id) {
  await sql`DELETE FROM workout_drafts WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------
export async function getStoredTokens() {
  const rows = await sql`SELECT * FROM auth WHERE id = 1`;
  return rows[0] || null;
}

export async function saveTokens({ athlete_id, access_token, refresh_token, expires_at }) {
  await sql`
    INSERT INTO auth (id, athlete_id, access_token, refresh_token, expires_at)
    VALUES (1, ${athlete_id}, ${access_token}, ${refresh_token}, ${expires_at})
    ON CONFLICT (id) DO UPDATE SET
      athlete_id = EXCLUDED.athlete_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at
  `;
}

export async function getValidAccessToken() {
  const tokens = await getStoredTokens();
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

  await saveTokens({
    athlete_id: tokens.athlete_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  });

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Exercise notes
// ---------------------------------------------------------------------------
export async function getAllExerciseNotes() {
  const rows = await sql`SELECT activity_id, notes_json FROM exercise_notes`;
  const map = {};
  for (const row of rows) {
    map[row.activity_id] = JSON.parse(row.notes_json);
  }
  return map;
}

export async function saveExerciseNotes(activityId, notes) {
  await sql`
    INSERT INTO exercise_notes (activity_id, notes_json, updated_at)
    VALUES (${activityId}, ${JSON.stringify(notes)}, NOW())
    ON CONFLICT (activity_id) DO UPDATE SET
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
export async function getStravaActivity(activityId) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status}`);
  return res.json();
}

// Update writable fields (name, description, ...) on an activity
export async function updateStravaActivityFields(activityId, fields) {
  const accessToken = await getValidAccessToken();
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
export async function updateStravaActivityDescription(activityId, description) {
  return updateStravaActivityFields(activityId, { description });
}

// Create a manual (no GPS file) activity on Strava (requires activity:write scope)
export async function createStravaActivity({ name, sportType, startDateLocal, elapsedTime, description }) {
  const accessToken = await getValidAccessToken();
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
export async function uploadStravaActivity({ fitBuffer, name, sportType, description, externalId }) {
  const accessToken = await getValidAccessToken();
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
export async function pollStravaUpload(uploadId, { maxAttempts = 15, intervalMs = 1000 } = {}) {
  const accessToken = await getValidAccessToken();
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

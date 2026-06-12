import {
  getValidAccessToken, fetchAllStravaActivities, shapeActivity, isStrength, isRun,
  getCachedActivities, getMostRecentCachedDate, upsertActivities, getCacheCount,
  backfillBestEfforts,
} from "../../lib/db";

export default async function handler(req, res) {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: "Not authenticated. Visit /api/auth/login" });
    }

    const forceSync = req.query.sync === "true";
    const cacheCount = await getCacheCount();

    if (cacheCount > 0 && !forceSync) {
      // Return cached data immediately — fast
      const cached = await getCachedActivities();
      const runs = cached.filter(a => isRun(a.sport_type));
      const strength = cached.filter(a => isStrength(a.sport_type));

      // Background incremental sync — don't await, return fast
      incrementalSync(accessToken).catch(() => {});
      // Passively chip away at best-efforts backfill, a couple at a time
      backfillBestEfforts(2).catch(() => {});

      return res.status(200).json({ runs, strength, total: cached.length, fromCache: true });
    }

    // First load or forced full sync — fetch everything
    const raw = await fetchAllStravaActivities(accessToken);
    const shaped = raw.map(shapeActivity);
    await upsertActivities(shaped);

    const runs = shaped.filter(a => isRun(a.sport_type));
    const strength = shaped.filter(a => isStrength(a.sport_type));

    res.status(200).json({ runs, strength, total: raw.length, fromCache: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function incrementalSync(accessToken) {
  const mostRecentDate = await getMostRecentCachedDate();
  if (!mostRecentDate) return;

  const afterEpoch = Math.floor(new Date(mostRecentDate + "T00:00:00Z").getTime() / 1000);
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${afterEpoch}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return;

  const newActivities = await res.json();
  if (newActivities.length > 0) {
    await upsertActivities(newActivities.map(shapeActivity));
  }
}

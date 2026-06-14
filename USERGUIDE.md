# User Guide

A walkthrough of everything the app does, tab by tab. This is mainly for future-you — a reference for what each button/feature is for and how the numbers are calculated.

---

## The five tabs

The header has five tabs: **dashboard**, **muscles**, **progress**, **strength**, **runs**. The orange box top-right shows lifetime running distance. **⟳ Sync Strava** pulls any new activities from Strava into the local cache (the app caches everything in Postgres so normal page loads don't hit Strava's API).

---

## Installing on your phone

The app is a Progressive Web App — on Android, use Chrome's **Add to Home screen** / **Install app**; on iOS, use Safari's **Add to Home Screen**. It opens in its own window with a dumbbell icon, no browser bar. See the README for how to package it as a real `.apk` if you want one.

---

## Accounts

Everyone signs in with their own Strava account via **Connect with Strava** — there's no separate username/password. Each person only ever sees and edits their own runs, strength sessions, custom exercises, drafts, XP/levels and challenges. Use **Sign out** in the header to switch accounts on a shared device.

**Delete my data** wipes everything this app has stored for your account — cached activities, exercise notes, custom exercises/muscle groups, drafts, best-effort history, XP/challenge history — and signs you out. It does not revoke the app's access to your Strava account (do that from Strava's own **Settings → My Apps** if you also want to free up a connected-athlete slot) or delete anything from Strava itself (e.g. activity descriptions already written). Signing in again afterwards starts fresh, as if for the first time.

---

## Dashboard

- **Monthly Challenge card** — a new challenge is generated each month, targeting whichever muscle group needs the most attention (untrained groups first, then your lowest-level trained group). Challenge types rotate monthly:
  - *Frequency* — log a given exercise in 4 sessions this month
  - *PB* — beat your all-time rep PB for an exercise this month
  - *Streak* — train that muscle every week for 4 weeks
  - *Volume* — log 100+ total reps of an exercise this month

  Progress bars fill as you log sessions; hitting 100% pops a "challenge complete" toast and awards a one-off **+200 XP** bonus to your Overall level. Each month's challenge is locked in the first time it's generated, so it won't shift around as your stats change later in the month.

- **Overall level** — a single ⭐ level fed by *all* training (not just one muscle), shown right below the challenge card. It uses the same XP curve as muscle levels, but decays much faster — just **3 days** of grace before losing **30 XP/day** — so it reflects how recently you've trained overall. Completed monthly challenges add their bonus XP straight to this level.

- **Past Challenges** — a collapsible history below the Overall level card showing every previous month's challenge, whether it was completed, and the bonus XP earned.

- **Top stat row** — total strength sessions, days since your last session (red if >14 days, amber if >7), and your run:strength session ratio (lower is more balanced).

- **8-week overview chart** — weekly running distance (km) vs. strength minutes, two separate scales, last 8 weeks.

- **Running / Strength summary panels** — quick all-time stats for each.

- **Recent Activity** — your latest activities (runs + strength) in one feed. Strength entries show **+ add exercise breakdown** if they don't have one yet — tap it to log sets/reps/weight against that session (this is what feeds the muscle XP system, PB detection, and challenges).

---

## Muscles

- **Body map** — tap a muscle group to expand its card below.

- **XP & Levelling** — every set you log earns XP for the muscles it works:
  - Reps: `2 XP per rep`, plus a weight bonus of `+0.1 XP per rep per kg` (so 10 reps @ 20kg = 10 × (2 + 2) = 40 XP)
  - Planks (and similar time-based exercises): `0.5 XP per second`
  - An exercise's *secondary* muscles (everything after the first one listed) get 40% of the XP the primary muscle gets
  - Level thresholds scale exponentially (`100 × 1.6^level` XP per level) — level 1 needs 160 XP, level 2 needs 256 more, etc.

- **Streak multiplier** — training a muscle group in consecutive Mon–Sun weeks builds a streak. Multiplier = `1.0 + (streak-1) × 0.2`, capping at **2.0× at a 5-week streak**. Shown on each muscle card as e.g. "3wk · 1.4x XP".

- **Decay** — if a muscle group goes **14+ days** without being trained, it starts losing **15 XP/day** until trained again (levels can drop as a result). This is what "effective XP" reflects vs. "raw XP".

- **XP History** — expand a muscle card to see recent XP gains per session.

- **Custom muscle groups** — **+ Muscle Group** lets you define extra groups (e.g. forearms, neck) beyond the built-in ten. They appear in their own "Custom groups" list and can be assigned to custom exercises.

---

## Progress

- **Session HR Trend** — sparkline of average HR across your last sessions that have HR data. A downward trend (highlighted green) means you're getting fitter at the same effort.

- **Run : Strength Ratio** — per month, runs ÷ strength sessions. Green ≤4, amber ≤8, red above that.

- **Exercise PBs** — your best-ever total reps (and best weight, where logged) for each exercise, pulled from every session's exercise breakdown.

---

## Strength

### Stats

YTD and all-time session counts, total time, and average session length, plus a by-month bar breakdown.

### Drafts & Templates

**+ New Draft** lets you jot down a workout plan (exercises + planned sets/reps/weight + notes) ahead of or during a session, without it being tied to any activity yet.

- A **plain draft** is one-shot: tap **Apply to session →**, pick the Strava session it belongs to (usually your most recent sync), and its exercises/notes get merged into that session's breakdown. The draft is then deleted.
- A **Template** (tick the checkbox when creating/editing) stays around after being applied, so you can reuse it for recurring routines (e.g. "Push Day").

### Sessions list

Shows every strength session — both ones synced from Strava and ones logged manually (tagged **Manual**). For each:

- **+ add exercise breakdown** / tap the exercise pills to edit sets, reps, weight, and session notes.
- Avg/Max HR are shown if present.
- **↗ Strava** link opens the activity on Strava (for synced sessions, or manual sessions that have been pushed).

#### Logging a session manually — **+ Log Session**

Use this for workouts you didn't record on your watch, or don't want appearing on your Strava feed as-is. Fill in:

- **Session name**, **date**, **duration** (minutes:seconds)
- **Import from watch (.fit, optional)** — see below
- **Avg HR / Max HR** (optional, manual entry)
- **Exercises** — same picker/sets UI as enriching a synced session
- **Notes**

#### Importing a `.fit` file from your watch

If you recorded the session on your Garmin (even as a generic "Workout" you don't want synced), export the original `.fit` file from [Garmin Connect](https://connect.garmin.com) (open the activity → ⚙️ gear icon → **Export Original**), then choose it in **Import from watch**. The app:

- Reads average HR, max HR, total duration, and calories and fills those fields in automatically
- Stores a downsampled heart-rate-over-time stream (capped at ~3600 points) alongside the session

#### Pushing a manual session to Strava — **Push to Strava**

Available once a manual session has an exercise breakdown and/or imported HR data. This builds a `.fit` activity file containing:

- A `SET` message per logged set (exercise, reps/duration, weight) — shows up in Strava's Strength Training set breakdown
- `RECORD` messages for each imported HR sample — shows up as Strava's heart-rate graph
- Session summary (avg/max HR, duration)

...and uploads it to Strava as a new activity. The manual session is then linked to that Strava activity (`stravaActivityId`) so it won't be duplicated on the next sync — the manual entry disappears from the local list and the synced Strava version (with your notes carried over) takes its place.

#### Removing sessions

- **delete** — removes a manual session that hasn't been pushed to Strava yet.
- **remove** — for synced sessions: clears a session from the local cache (and its exercise notes) if you've deleted the activity on Strava directly, so it stops showing up here and counting toward your stats.

### Custom exercises

**+ Exercise** opens a form to add your own exercise (name, unit — reps or seconds — and which muscle group(s) it trains, primary first). Custom exercises appear everywhere built-in ones do (pickers, drafts, breakdowns) and can be removed from the "Custom exercises" list in the Strength tab.

---

## Runs

- **YTD / All-time stats** — distance, time, average pace.
- **Run distances** — a grid of distance buckets (400m up to marathon). Tap a bucket with runs in it to expand and see your fastest efforts at that distance.
  - For buckets with a Strava best-effort equivalent (400m, 1K, 1 Mile, 2 Mile, 5K, 10K, 15K, Half Marathon, 30K, Marathon), the app fetches Strava's per-activity "best efforts" data in the background so the list shows your fastest **split** *within* a longer run, not just whole-run paces. This builds up gradually (a couple of activities per normal page load, more while a bucket is expanded) — see the rate-limit note below. While indexing is incomplete, the list falls back to ranking whole runs by pace.

---

## Syncing & Strava API limits

Strava allows 200 requests/15min and 2,000/day. Normal usage (cached page loads) barely touches this. The background best-efforts indexing for the Runs tab is the main thing that uses extra requests, and it's designed to fail quietly and resume later if you hit the limit — just wait ~15 minutes.

---

## Personalising

The app name ("Strength Tracker") appears in `pages/index.js` (page title and header) — search and replace to rename it, then Vercel redeploys automatically from GitHub. Since the app is shared, this name applies to everyone who signs in.

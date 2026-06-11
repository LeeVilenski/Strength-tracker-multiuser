# Strength Tracker

A personal training dashboard that connects to your Strava account and tracks your strength sessions alongside your running. Log sets, reps and weight, track muscle group XP levels, and see how your training balance looks over time.

---

## What you'll need

- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account (this is where the app runs)
- A [Strava](https://www.strava.com) account
- An [Anthropic](https://console.anthropic.com) API key (optional — only needed for the AI coach feature)

The whole setup takes about 20–30 minutes. You don't need to install anything on your computer.

---

## Step 1 — Fork this repository

Forking makes your own personal copy of the code that you can deploy independently.

1. Make sure you're signed into GitHub
2. Click the **Fork** button at the top right of this page
3. Click **Create fork**

You now have your own copy at `github.com/YOUR-USERNAME/Eds-Strength-Tracker`.

---

## Step 2 — Create a Strava API app

This gives the tracker permission to read your Strava data.

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Fill in the form:
   - **Application Name**: anything you like, e.g. "My Strength Tracker"
   - **Category**: choose any
   - **Club**: leave blank
   - **Website**: put `https://example.com` for now
   - **Authorization Callback Domain**: put `localhost` for now — you'll update this later
3. Click **Save** and agree to the terms
4. You'll see your **Client ID** (a short number) and **Client Secret** (a long string) — keep this page open, you'll need both shortly

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / sign in (you can use your GitHub account)
2. Click **Add New Project**
3. Click **Import** next to your forked `Eds-Strength-Tracker` repository
   - If you don't see it, click **Adjust GitHub App Permissions** and grant Vercel access to it
4. Leave all the settings as they are and click **Deploy**
5. Wait about a minute for it to finish building
6. Once done, click **Continue to Dashboard** — you'll see your app's URL at the top (something like `https://eds-strength-tracker-abc.vercel.app`). **Copy this URL.**

---

## Step 4 — Add a database

1. In your Vercel project dashboard, click the **Storage** tab
2. Click **Create Database**
3. Choose **Neon Serverless Postgres** and click **Continue**
4. Leave the defaults and click **Create**
5. Vercel will connect the database to your project automatically — no extra steps needed

---

## Step 5 — Add your environment variables

These are the secret keys that let your app talk to Strava, the database, and optionally the AI coach.

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add each of the following by typing the name in the **Key** field and the value in the **Value** field, then clicking **Save**:

| Key | Value |
|-----|-------|
| `STRAVA_CLIENT_ID` | The Client ID number from Step 2 |
| `STRAVA_CLIENT_SECRET` | The Client Secret from Step 2 |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL from Step 3, e.g. `https://eds-strength-tracker-abc.vercel.app` — no trailing slash |
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) — optional, skip if you don't want the AI coach |

> **Important:** `NEXT_PUBLIC_APP_URL` must exactly match your Vercel URL — copy and paste it rather than typing it.

---

## Step 6 — Redeploy

After adding environment variables you need to redeploy so the app picks them up.

1. Go to the **Deployments** tab in your Vercel project
2. Click the three dots **...** next to the most recent deployment
3. Click **Redeploy** → **Redeploy**
4. Wait for it to finish

---

## Step 7 — Update your Strava callback URL

Now that you have a live URL, you need to tell Strava about it.

1. Go back to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Find **Authorization Callback Domain** and replace `localhost` with your Vercel domain — just the domain part, no `https://`, no trailing slash
   - e.g. `eds-strength-tracker-abc.vercel.app`
3. Save

---

## Step 8 — Set up the database tables

Visit this URL in your browser (replace with your own URL):

```
https://your-app.vercel.app/api/setup
```

You should see: `{"ok":true,"message":"Database tables created."}`

If you see an error, wait 30 seconds and try again — the database sometimes takes a moment to wake up on first use.

---

## Step 9 — Connect your Strava account

1. Visit your app URL
2. Click **Connect with Strava**
3. Authorise the app
4. You'll be redirected back and your activities will start loading

The first load may take 10–20 seconds as it pulls your full Strava history. After that it caches everything locally so it loads quickly.

---

## Personalising the app

The app is currently named "Ed's Strength Tracker". To change it to your name:

1. Go to your forked repository on GitHub
2. Open `pages/index.js`
3. Click the pencil ✏️ icon to edit
4. Press **Ctrl+F** (or **Cmd+F** on Mac) and search for `Ed's Strength Tracker`
5. Replace both occurrences with your own name
6. Scroll down and click **Commit changes**

Vercel will automatically redeploy when you save changes on GitHub.

---

## How to record strength sessions

For your sessions to appear in the tracker, record them on your Garmin/Forerunner as one of these activity types:

- **Workout**
- **Strength Training**
- **Weight Training**
- **CrossFit**
- **HIIT**

Once the activity syncs to Strava, it will appear automatically in the app. Tap **+ add exercise breakdown** on the session to log your sets, reps and weight.

For quick sessions you don't want on your Strava feed, use the **+ Log Session** button in the Strength tab.

---

## Troubleshooting

**"token_exchange_failed" when connecting Strava**
Check that `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are correct in Vercel, and that `NEXT_PUBLIC_APP_URL` matches your exact Vercel URL. Try deleting and re-adding the variables, then redeploy.

**The app loads but shows no activities**
Try clicking the **⟳ Sync Strava** button in the top right corner of the app.

**Database errors on `/api/setup`**
Wait a minute and try again. If it still fails, check the Vercel dashboard → Logs tab for the specific error message.

**I made a change on GitHub but the app hasn't updated**
Vercel should redeploy automatically. Check the Deployments tab — if the latest build shows an error, click it to see what went wrong.

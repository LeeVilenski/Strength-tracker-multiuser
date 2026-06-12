// ---------------------------------------------------------------------------
// Shared-secret PIN gate for actions that write to Strava (pushing a manual
// session, renaming an activity). Set APP_PIN in Vercel to require it; if
// it's unset these actions are unprotected, same as before this existed.
// ---------------------------------------------------------------------------
export function pinOk(pin) {
  const required = process.env.APP_PIN;
  if (!required) return true;
  return pin === required;
}

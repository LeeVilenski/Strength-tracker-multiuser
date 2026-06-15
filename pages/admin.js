import { useEffect, useState } from "react";
import Head from "next/head";

const C = { bg: "#f4f5f7", surface: "#ffffff", border: "#e5e7eb", text: "#111827", textSecondary: "#374151", textMuted: "#6b7280", textFaint: "#9ca3af", blue: "#2563eb" };
const S = {
  page: { fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", color: C.text, maxWidth: 520, margin: "0 auto" },
  header: { background: C.surface, padding: "24px 20px", borderBottom: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  body: { padding: "20px 16px 80px" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Admin() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [yourAthleteId, setYourAthleteId] = useState(null);

  useEffect(() => {
    fetch("/api/admin/users").then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "Failed to load");
        if (data.yourAthleteId) setYourAthleteId(data.yourAthleteId);
        return;
      }
      setUsers(data.users);
    }).catch(() => setError("Failed to load"));
  }, []);

  return (
    <div style={S.page}>
      <Head><title>Connected accounts</title></Head>
      <div style={S.header}>
        <div style={{ fontSize: 18, fontWeight: "700" }}>Connected accounts</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Strava accounts that have signed in to this app</div>
      </div>
      <div style={S.body}>
        {error === "Not signed in" && (
          <div style={S.card}>
            <div style={{ marginBottom: 12 }}>Sign in with Strava to view this page.</div>
            <a href="/api/auth/login" style={{ color: C.blue, fontWeight: "600", textDecoration: "none" }}>Sign in →</a>
          </div>
        )}
        {error === "Not authorized" && (
          <div style={S.card}>
            <div style={{ marginBottom: 8 }}>This page is restricted to the app admin.</div>
            {yourAthleteId && (
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
                To enable access, set <code>ADMIN_ATHLETE_ID={yourAthleteId}</code> in your Vercel project's environment variables and redeploy.
              </div>
            )}
          </div>
        )}
        {error && error !== "Not signed in" && error !== "Not authorized" && (
          <div style={S.card}>{error}</div>
        )}
        {!error && !users && <div style={S.card}>Loading…</div>}
        {users && users.length === 0 && <div style={S.card}>No accounts have connected yet.</div>}
        {users && users.map(u => (
          <div key={u.athleteId} style={{ ...S.card, display: "flex", gap: 12, alignItems: "center" }}>
            {u.profileUrl && <img src={u.profileUrl} alt="" width={48} height={48} style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: "600", fontSize: 14 }}>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "Unnamed athlete"}</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1 }}>Athlete ID {u.athleteId}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                Joined {fmtDate(u.createdAt)} · last active {fmtDate(u.updatedAt)} · {u.activityCount} cached activit{u.activityCount === 1 ? "y" : "ies"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

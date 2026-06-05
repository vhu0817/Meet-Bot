"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import styles from "./dashboard.module.css";

// ── Fallback mock data (used when API isn't reachable) ──────
const FALLBACK_SESSIONS = [
  {
    id: "s1",
    title: "Q2 Product Roadmap Review",
    date: "May 5, 2026 · 10:00 AM",
    duration: "52 min",
    participants: 6,
    status: "completed",
    summary: "Discussed feature prioritization for Q2. Team agreed to focus on onboarding improvements and API v2 launch.",
    actionItems: 4,
  },
  {
    id: "s2",
    title: "Engineering Standup",
    date: "May 5, 2026 · 9:00 AM",
    duration: "18 min",
    participants: 4,
    status: "completed",
    summary: "Blockers: auth service deployment. Backend team to fix by EOD. Frontend team ahead of schedule.",
    actionItems: 2,
  },
];

interface Session {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  status: string;
  summary: string | { executive_summary?: string; [key: string]: unknown };
  actionItems: number;
}

interface ActiveBot {
  id: string;
  meetLink: string;
  status: string; // joining | listening | processing | done | error
  createdAt: string;
}

const BOT_STATUS_LABELS: Record<string, string> = {
  joining: "🔄 Joining meeting…",
  listening: "🎙️ Listening live",
  processing: "⏳ Processing transcript…",
  done: "✅ Summary ready!",
  error: "❌ Error occurred",
  stopped: "⏹️ Stopped",
};

export default function DashboardPage() {
  const [meetLink, setMeetLink] = useState("");
  const [launching, setLaunching] = useState(false);
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<Session[]>(FALLBACK_SESSIONS);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [launchError, setLaunchError] = useState("");

  // Active bot tracking
  const [activeBot, setActiveBot] = useState<ActiveBot | null>(null);
  const [botStatusMsg, setBotStatusMsg] = useState("");
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch sessions from API
  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      try {
        const data = await api.getSessions();
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
        }
      } catch (err) {
        console.warn("Could not fetch sessions from API, using fallback:", err);
      } finally {
        setLoadingSessions(false);
      }
    }
    if (user) fetchSessions();
  }, [user]);

  const pollBotStatus = useCallback(async (botId: string) => {
    try {
      const data = await api.getBotStatus(botId);
      const status = data.status || "joining";

      setActiveBot((prev) => prev ? { ...prev, status } : null);
      setBotStatusMsg(BOT_STATUS_LABELS[status] || `Status: ${status}`);

      // If bot is done, fetch transcript + summarize
      if (status === "done") {
        stopPolling();
        await handleBotDone(botId);
      }

      // If bot errored, stop polling
      if (status === "error" || status === "fatal") {
        stopPolling();
        setBotStatusMsg("❌ Bot encountered an error. Please try again.");
      }
    } catch (err) {
      console.warn("Poll error:", err);
    }
  }, []);

  const startPolling = useCallback((botId: string) => {
    // Poll every 5 seconds
    pollRef.current = setInterval(() => pollBotStatus(botId), 5000);
  }, [pollBotStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── Handle bot completion → fetch transcript → summarize → save ──
  async function handleBotDone(botId: string) {
    setFetchingTranscript(true);
    setBotStatusMsg("📝 Fetching transcript & generating AI summary… (this may take 30–60s)");

    try {
      // Fetch transcript with auto-summarization
      const data = await api.getBotTranscript(botId, true);

      if (data.transcript && data.transcript.length > 0) {
        // Create a new session from the transcript + summary
        const meetUrl = activeBot?.meetLink || "";
        const sessionData = {
          title: `Meeting — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
          meetLink: meetUrl,
          transcript: data.transcript,
          summary: data.summary || null,
          duration: estimateDuration(data.transcript),
          participants: countParticipants(data.transcript),
        };

        const result = await api.createSession(sessionData);
        setBotStatusMsg("✅ Session saved! Redirecting…");

        // Add to local sessions list
        if (result.session) {
          setSessions((prev) => [result.session, ...prev]);
        }

        // Redirect to the new session after a short delay
        setTimeout(() => {
          if (result.session?.id) {
            router.push(`/session/${result.session.id}`);
          }
          setActiveBot(null);
          setBotStatusMsg("");
        }, 2000);
      } else {
        setBotStatusMsg("⚠️ No transcript captured. The meeting may have been too short.");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Error processing bot results:", errorMsg);
      setBotStatusMsg(`⚠️ ${errorMsg}. Click "Fetch Transcript & Summarize" to retry.`);
    } finally {
      setFetchingTranscript(false);
    }
  }

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetLink.trim()) return;
    setLaunching(true);
    setLaunchError("");

    try {
      const data = await api.launchBot(meetLink);
      const bot: ActiveBot = {
        id: data.bot.id,
        meetLink,
        status: data.bot.status || "joining",
        createdAt: data.bot.createdAt || new Date().toISOString(),
      };

      setActiveBot(bot);
      setBotStatusMsg(BOT_STATUS_LABELS[bot.status] || "🔄 Deploying…");
      setMeetLink("");

      // Start polling for status updates
      startPolling(bot.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to launch bot";
      setLaunchError(error);
      setTimeout(() => setLaunchError(""), 8000);
    } finally {
      setLaunching(false);
    }
  };

  const handleStopBot = async () => {
    if (!activeBot) return;
    stopPolling();
    setBotStatusMsg("⏹️ Stopping bot…");

    try {
      await api.stopBot(activeBot.id);
      setBotStatusMsg("⏹️ Bot stopped. Waiting for Recall.ai to process transcript (up to 60s)…");

      // Recall.ai needs time to finalize the transcript after the call ends
      setTimeout(() => handleBotDone(activeBot.id), 10000);
    } catch (err) {
      console.error("Stop bot error:", err);
      setBotStatusMsg("⚠️ Could not stop bot. It may have already left.");
    }
  };

  // ── Manual transcript fetch (fallback button) ─────────────
  const handleFetchTranscript = async () => {
    if (!activeBot) return;
    await handleBotDone(activeBot.id);
  };

  const handleDismissBot = () => {
    stopPolling();
    setActiveBot(null);
    setBotStatusMsg("");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Total Meetings", value: String(sessions.length), icon: "📅" },
    { label: "Hours Saved", value: `${Math.round(sessions.length * 0.75)}h`, icon: "⏱️" },
    { label: "Action Items", value: String(sessions.reduce((sum, s) => sum + (s.actionItems || 0), 0)), icon: "✅" },
    { label: "Participants", value: String(sessions.reduce((sum, s) => sum + (typeof s.participants === "number" ? s.participants : 0), 0)), icon: "👥" },
  ];

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          <span>⚡</span> MeetScribe
        </Link>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span>🏠</span> Dashboard
          </Link>
          <Link href="/sessions" className={styles.navItem}>
            <span>📋</span> Sessions
          </Link>
          <Link href="/starred" className={styles.navItem}>
            <span>⭐</span> Starred
          </Link>
          <Link href="/settings" className={styles.navItem}>
            <span>⚙️</span> Settings
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{(user.displayName || user.email || "U")[0].toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user.displayName || "User"}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 8, fontSize: 13, padding: "8px 12px" }}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className={styles.headerRight}>
            <input
              className={`input ${styles.searchInput}`}
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={`card ${styles.statCard}`}>
              <span className={styles.statIcon}>{s.icon}</span>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Active Bot Tracker ──────────────────────────── */}
        {activeBot && (
          <div className={`card`} style={{
            border: activeBot.status === "listening" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.05)",
            padding: "20px 24px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  🤖 Active Bot
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", wordBreak: "break-all" }}>
                  {activeBot.meetLink}
                </p>
              </div>
              <span className={`badge ${activeBot.status === "listening" ? "badge-green" : activeBot.status === "done" ? "badge-green" : "badge-amber"}`}>
                {activeBot.status === "listening" && <span className="dot-pulse" />}
                {activeBot.status}
              </span>
            </div>

            {/* Status message */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: 14,
              color: "var(--text-primary)",
              marginBottom: 12,
            }}>
              {botStatusMsg}
              {activeBot.status === "listening" && (
                <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                  Speak in the meeting — the bot is recording. When done, click &quot;Stop &amp; Get Summary&quot; below.
                </span>
              )}
            </div>

            {/* Waveform animation when listening */}
            {activeBot.status === "listening" && (
              <div style={{
                display: "flex",
                gap: 2,
                height: 24,
                alignItems: "flex-end",
                marginBottom: 12,
              }}>
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} style={{
                    width: 3,
                    borderRadius: 2,
                    background: "var(--purple)",
                    animation: `waveform 1.2s ease-in-out ${i * 0.04}s infinite alternate`,
                    height: `${8 + Math.random() * 16}px`,
                  }} />
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {(activeBot.status === "listening" || activeBot.status === "joining") && (
                <button className="btn btn-danger" style={{ fontSize: 13, padding: "8px 16px" }} onClick={handleStopBot}>
                  ⏹ Stop &amp; Get Summary
                </button>
              )}
              {(activeBot.status === "done" || activeBot.status === "stopped" || activeBot.status === "error") && !fetchingTranscript && (
                <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px" }} onClick={handleFetchTranscript}>
                  📝 Fetch Transcript &amp; Summarize
                </button>
              )}
              {fetchingTranscript && (
                <button className="btn btn-ghost" disabled style={{ fontSize: 13, padding: "8px 16px" }}>
                  ⏳ Processing…
                </button>
              )}
              <button className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px" }} onClick={handleDismissBot}>
                ✕ Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Launch Bot (only show when no active bot) */}
        {!activeBot && (
          <div className={`card ${styles.launchCard}`}>
            <div className={styles.launchLeft}>
              <div className={styles.launchIcon}>🤖</div>
              <div>
                <h2>Deploy a new bot</h2>
                <p>Paste your Google Meet link and the bot will join instantly</p>
              </div>
            </div>
            <form onSubmit={handleLaunch} className={styles.launchForm}>
              <input
                className={`input ${styles.launchInput}`}
                placeholder="meet.google.com/abc-defg-hij"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={launching || !meetLink.trim()}
              >
                {launching ? (
                  <>
                    <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                    Launching…
                  </>
                ) : (
                  "Launch Bot →"
                )}
              </button>
            </form>
          </div>
        )}

        {/* Launch error */}
        {launchError && (
          <div style={{ background: "var(--red-dim)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--radius-sm)", padding: "10px 16px", fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
            {launchError}
          </div>
        )}

        {/* Sessions list */}
        <div className={styles.sessionsHeader}>
          <h2>Recent Sessions</h2>
          <span className="badge badge-purple">{filtered.length} total</span>
        </div>

        <div className={styles.sessionsList}>
          {filtered.map((session) => (
            <Link key={session.id} href={`/session/${session.id}`} className={`card ${styles.sessionCard}`}>
              <div className={styles.sessionTop}>
                <div className={styles.sessionMeta}>
                  <span className="badge badge-green">
                    <span className="dot-pulse" style={{ background: "var(--green)" }} />
                    {session.status === "completed" ? "Completed" : session.status}
                  </span>
                  <span className={styles.sessionDate}>{session.date}</span>
                </div>
                <div className={styles.sessionActions}>
                  <span className={styles.sessionDuration}>⏱ {session.duration}</span>
                  <span className={styles.sessionParticipants}>👥 {session.participants}</span>
                </div>
              </div>

              <h3 className={styles.sessionTitle}>{session.title}</h3>
              <p className={styles.sessionSummary}>{typeof session.summary === "string" ? session.summary : session.summary?.executive_summary || "Meeting recorded"}</p>

              <div className={styles.sessionFooter}>
                <span className="badge badge-amber">✅ {session.actionItems} action items</span>
                <span className={styles.sessionLink}>View full summary →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Waveform animation keyframes */}
      <style jsx global>{`
        @keyframes waveform {
          0% { height: 4px; }
          100% { height: 22px; }
        }
      `}</style>
    </div>
  );
}


function estimateDuration(transcript: Array<{ time: string }>): string {
  if (!transcript || transcript.length === 0) return "Unknown";
  const lastTime = transcript[transcript.length - 1].time;
  const parts = lastTime.split(":");
  const mins = parseInt(parts[0]) || 0;
  if (mins < 1) return "< 1 min";
  return `${mins} min`;
}

function countParticipants(transcript: Array<{ speaker: string }>): number {
  if (!transcript) return 0;
  return new Set(transcript.map((t) => t.speaker)).size;
}

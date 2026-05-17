"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import styles from "../dashboard/dashboard.module.css";

interface Session {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  status: string;
  summary: string | { executive_summary?: string; [key: string]: unknown };
  actionItems: number;
  starred?: boolean;
}

export default function StarredPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      try {
        const data = await api.getSessions();
        // Show sessions that are starred (or first 3 as a demo)
        const all = data.sessions || [];
        setSessions(all.filter((s: Session) => s.starred));
      } catch (err) {
        console.warn("Could not fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchSessions();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (authLoading || !user) return null;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          <span>⚡</span> MeetScribe
        </Link>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItem}><span>🏠</span> Dashboard</Link>
          <Link href="/sessions" className={styles.navItem}><span>📋</span> Sessions</Link>
          <Link href="/starred" className={`${styles.navItem} ${styles.navItemActive}`}><span>⭐</span> Starred</Link>
          <Link href="/settings" className={styles.navItem}><span>⚙️</span> Settings</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{(user.displayName || user.email || "U")[0].toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user.displayName || "User"}</div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8, fontSize: 13, padding: "8px 12px" }} onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Starred Sessions</h1>
            <p className={styles.pageSubtitle}>Your important meetings</p>
          </div>
        </header>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((i) => (
              <div key={i} className="card" style={{ height: 120, animation: "pulse 1.5s ease-in-out infinite", opacity: 0.6 }} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h3 style={{ marginBottom: 8 }}>No starred sessions yet</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Star important sessions from the session detail page.</p>
            <Link href="/sessions" className="btn btn-primary" style={{ display: "inline-flex", marginTop: 20 }}>Browse Sessions →</Link>
          </div>
        ) : (
          <div className={styles.sessionsList}>
            {sessions.map((session) => (
              <Link key={session.id} href={`/session/${session.id}`} className={`card ${styles.sessionCard}`}>
                <div className={styles.sessionTop}>
                  <div className={styles.sessionMeta}>
                    <span className="badge badge-green">✅ Completed</span>
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
        )}
      </main>
    </div>
  );
}

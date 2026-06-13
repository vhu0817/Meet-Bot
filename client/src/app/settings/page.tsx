"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "../dashboard/dashboard.module.css";

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <Link href="/ask" className={styles.navItem}><span>💬</span> Ask</Link>
          <Link href="/starred" className={styles.navItem}><span>⭐</span> Starred</Link>
          <Link href="/settings" className={`${styles.navItem} ${styles.navItemActive}`}><span>⚙️</span> Settings</Link>
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
            <h1 className={styles.pageTitle}>Settings</h1>
            <p className={styles.pageSubtitle}>Manage your account and preferences</p>
          </div>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
          {/* Profile */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👤 Profile</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Display Name</label>
                <input className="input" defaultValue={user.displayName || ""} style={{ width: "100%" }} placeholder="Your name" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Email</label>
                <input className="input" value={user.email || ""} style={{ width: "100%", opacity: 0.6 }} disabled />
              </div>
            </div>
          </div>

          {/* Bot Settings */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🤖 Bot Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Bot Display Name</label>
                <input className="input" defaultValue="MeetScribe Bot" style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Auto-summarize after meeting</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Automatically generate AI summary when bot leaves</div>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: "var(--accent)", cursor: "pointer", position: "relative" }}>
                  <div style={{ position: "absolute", right: 2, top: 2, width: 18, height: 18, borderRadius: "50%", background: "white" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔐 Account</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Firebase Auth UID</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{user.uid}</div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <button className="btn btn-ghost" style={{ color: "var(--red, #ef4444)", borderColor: "rgba(239,68,68,0.3)" }} onClick={handleLogout}>
                  Sign out of all devices
                </button>
              </div>
            </div>
          </div>

          {/* Save */}
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={handleSave}>
            {saved ? "✅ Saved!" : "Save Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}

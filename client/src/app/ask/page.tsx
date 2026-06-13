"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import styles from "../dashboard/dashboard.module.css";
import ask from "./ask.module.css";

interface Source {
  n: number;
  sessionId: string;
  title: string;
  time: string;
  snippet: string;
  score: number;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

const SUGGESTIONS = [
  "What decisions were made last week?",
  "What are my open action items?",
  "Summarize what was said about the roadmap",
  "Who owns the API launch?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.ask(q);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources || [] },
      ]);
    } catch (err) {
      console.warn("Ask failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong reaching the assistant. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          <span>⚡</span> MeetScribe
        </Link>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItem}>
            <span>🏠</span> Dashboard
          </Link>
          <Link href="/sessions" className={styles.navItem}>
            <span>📋</span> Sessions
          </Link>
          <Link href="/ask" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span>💬</span> Ask
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
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8, fontSize: 13, padding: "8px 12px" }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Ask your meetings</h1>
            <p className={styles.pageSubtitle}>Search across every transcript with AI — answers cite the meetings they came from</p>
          </div>
        </header>

        <div className={ask.chat}>
          {messages.length === 0 ? (
            <div className={ask.empty}>
              <div className={ask.emptyIcon}>💬</div>
              <h3>Ask anything about your past meetings</h3>
              <p>Answers are grounded in your own transcripts and cite their sources.</p>
              <div className={ask.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className={ask.suggestion} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={ask.messages}>
              {messages.map((m, i) => (
                <div key={i} className={`${ask.message} ${m.role === "user" ? ask.user : ask.assistant}`}>
                  <div className={ask.bubble}>{m.text}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className={ask.sources}>
                      <div className={ask.sourcesLabel}>Sources</div>
                      {m.sources.map((src) => (
                        <Link key={src.n} href={`/session/${src.sessionId}`} className={ask.source}>
                          <div className={ask.sourceTop}>
                            <span className={ask.sourceNum}>[{src.n}]</span>
                            <span className={ask.sourceTitle}>{src.title}</span>
                            <span className={ask.sourceTime}>⏱ {src.time}</span>
                          </div>
                          <p className={ask.sourceSnippet}>{src.snippet}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className={`${ask.message} ${ask.assistant}`}>
                  <div className={`${ask.bubble} ${ask.thinking}`}>
                    <span className="dot-pulse" /> Searching your meetings…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}

          <form
            className={ask.composer}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className={`input ${ask.composerInput}`}
              placeholder="Ask about your meetings…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              {loading ? "…" : "Ask"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

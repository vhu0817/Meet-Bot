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

interface Turn {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

interface ConversationMeta {
  id: string;
  title: string;
  updatedAt: string;
  turnCount: number;
}

const SUGGESTIONS = [
  "What decisions were made last week?",
  "What are my open action items?",
  "Summarize what was said about the roadmap",
  "Who owns the API launch?",
];

// Older transcripts stored bad caption timestamps as "NaN:NaN" — hide them.
function cleanTime(time: string) {
  return !time || time.includes("NaN") ? "" : time;
}
function cleanSnippet(text: string) {
  return text.replace(/\[NaN:NaN\]\s*/g, "");
}

// Group conversations into Today / Yesterday / Previous 7 days / Older.
function groupByDate(items: ConversationMeta[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  const groups: { label: string; items: ConversationMeta[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const it of items) {
    const t = new Date(it.updatedAt).getTime();
    if (t >= startOfToday) groups[0].items.push(it);
    else if (t >= startOfToday - dayMs) groups[1].items.push(it);
    else if (t >= startOfToday - 7 * dayMs) groups[2].items.push(it);
    else groups[3].items.push(it);
  }
  return groups.filter((g) => g.items.length > 0);
}

export default function AskPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.warn("Could not load conversations:", err);
    }
  };

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const newChat = () => {
    setTurns([]);
    setActiveId(null);
    setInput("");
  };

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setTurns((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await api.ask(q, 5, activeId || undefined);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources || [] },
      ]);
      if (data.conversationId) setActiveId(data.conversationId);
      loadConversations();
    } catch (err) {
      console.warn("Ask failed:", err);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong reaching the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (id: string) => {
    if (id === activeId) return;
    try {
      const data = await api.getConversation(id);
      const conv = data.conversation;
      if (!conv) return;
      setTurns(conv.turns || []);
      setActiveId(id);
    } catch (err) {
      console.warn("Could not open conversation:", err);
    }
  };

  const removeConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) newChat();
    try {
      await api.deleteConversation(id);
    } catch (err) {
      console.warn("Could not delete conversation:", err);
      loadConversations();
    }
  };

  if (authLoading || !user) return null;

  const grouped = groupByDate(conversations);

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

      <main className={`${styles.main} ${ask.askMain}`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Ask your meetings</h1>
            <p className={styles.pageSubtitle}>Search across every transcript with AI — answers cite the meetings they came from</p>
          </div>
        </header>

        <div className={ask.workspace}>
          <div className={ask.chat}>
            {turns.length === 0 ? (
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
                {turns.map((m, i) => (
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
                              {cleanTime(src.time) && <span className={ask.sourceTime}>⏱ {cleanTime(src.time)}</span>}
                            </div>
                            <p className={ask.sourceSnippet}>{cleanSnippet(src.snippet)}</p>
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
                placeholder={activeId ? "Ask a follow-up…" : "Ask about your meetings…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
                {loading ? "…" : "Ask"}
              </button>
            </form>
          </div>

          <aside className={ask.historyPanel}>
            <button className={ask.newChatBtn} onClick={newChat}>
              <span>✏️</span> New chat
            </button>
            {conversations.length === 0 ? (
              <p className={ask.historyEmpty}>Your conversations will show up here.</p>
            ) : (
              <div className={ask.historyScroll}>
                {grouped.map((group) => (
                  <div key={group.label} className={ask.historyGroup}>
                    <div className={ask.historyGroupLabel}>{group.label}</div>
                    {group.items.map((c) => (
                      <div
                        key={c.id}
                        className={`${ask.historyItem} ${c.id === activeId ? ask.historyItemActive : ""}`}
                        onClick={() => openConversation(c.id)}
                      >
                        <span className={ask.historyQuestion}>{c.title}</span>
                        <span
                          className={ask.historyDelete}
                          onClick={(e) => removeConversation(c.id, e)}
                          aria-label="Delete conversation"
                        >
                          ✕
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

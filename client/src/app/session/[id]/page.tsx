"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import styles from "./session.module.css";

interface TranscriptLine {
  speaker: string;
  time: string;
  text: string;
}

interface ActionItem {
  owner: string;
  task: string;
  deadline: string;
}

interface Summary {
  executive_summary: string;
  key_decisions: string[];
  action_items: ActionItem[];
  main_topics: string[];
  sentiment: string;
  participants_detected: string[];
  meeting_duration_estimate: string;
}

interface SessionData {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: string;
  transcript: TranscriptLine[];
  summary: Summary;
}

const MOCK_TRANSCRIPT: TranscriptLine[] = [
  { speaker: "Sarah", time: "10:02", text: "Alright, let's kick things off. Can everyone hear me okay?" },
  { speaker: "Mike", time: "10:02", text: "Yeah, audio is clear on my end." },
  { speaker: "Alex", time: "10:03", text: "Same here. I'll share my screen in a second — I've got the roadmap doc open." },
  { speaker: "Sarah", time: "10:04", text: "Perfect. So the main goal today is to lock down priorities for Q2. We have about 12 features in the backlog and we need to narrow it down to 4 or 5 that we can realistically ship." },
  { speaker: "Mike", time: "10:05", text: "From the engineering side, the onboarding flow refactor is the highest ROI item. It's been blocking new user activation for months." },
  { speaker: "Alex", time: "10:07", text: "I agree with Mike on the onboarding piece. Design already has mockups ready, so it's basically a matter of implementation time." },
  { speaker: "Sarah", time: "10:08", text: "Great. Let's mark that as P1. What about the API v2 launch? That was listed as critical last quarter." },
  { speaker: "Mike", time: "10:10", text: "API v2 is 80% done. We need two more weeks to stabilize the auth endpoints and write the migration guide." },
  { speaker: "Sarah", time: "10:11", text: "Okay, that's P1 as well. Mike can you own the API launch timeline? Send me a draft by Friday." },
  { speaker: "Mike", time: "10:11", text: "On it. Friday works." },
];

const MOCK_SUMMARY: Summary = {
  executive_summary:
    "The Q2 product roadmap review aligned the team on top priorities. Onboarding flow refactor and API v2 launch were confirmed as P1 items. The team agreed design assets are ready and implementation can begin immediately.",
  key_decisions: [
    "Onboarding flow refactor is P1 — unblocks new user activation",
    "API v2 launch is P1 — currently 80% complete, 2 weeks to stabilize",
    "Roadmap narrowed from 12 to 4-5 shippable features for Q2",
  ],
  action_items: [
    { owner: "Mike", task: "Send API v2 launch timeline draft", deadline: "Friday, May 9" },
    { owner: "Alex", task: "Share design mockups with engineering team", deadline: "Monday, May 12" },
    { owner: "Sarah", task: "Update JIRA backlog with Q2 priority tags", deadline: "EOD today" },
    { owner: "Team", task: "Schedule follow-up in 2 weeks to review progress", deadline: "May 19" },
  ],
  main_topics: ["Q2 Roadmap", "Onboarding Refactor", "API v2", "Engineering Capacity"],
  sentiment: "positive",
  participants_detected: ["Sarah", "Mike", "Alex"],
  meeting_duration_estimate: "52 minutes",
};

const SPEAKER_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function getSpeakerColor(speaker: string, allSpeakers: string[]): string {
  const idx = allSpeakers.indexOf(speaker);
  return SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
}

type BotStatus = "idle" | "joining" | "listening" | "processing" | "done";

const STATUS_LABELS: Record<BotStatus, string> = {
  idle: "Not started",
  joining: "Joining meeting…",
  listening: "Listening live",
  processing: "Generating summary…",
  done: "Summary ready",
};
const STATUS_COLORS: Record<BotStatus, string> = {
  idle: "badge-purple",
  joining: "badge-amber",
  listening: "badge-green",
  processing: "badge-amber",
  done: "badge-green",
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [botStatus, setBotStatus] = useState<BotStatus>("done");
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("summary");
  const [copied, setCopied] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch session data from API
  useEffect(() => {
    async function fetchSession() {
      if (!user) return;
      try {
        const data = await api.getSession(sessionId);
        if (data.session) {
          setSession(data.session);
        }
      } catch (err) {
        console.warn("Could not fetch session from API, using fallback:", err);
        // Use fallback mock data
        setSession({
          id: sessionId,
          title: "Q2 Product Roadmap Review",
          date: "May 5, 2026 · 10:00 AM",
          duration: "52 min",
          status: "completed",
          transcript: MOCK_TRANSCRIPT,
          summary: MOCK_SUMMARY,
        });
      } finally {
        setLoadingSession(false);
      }
    }
    if (user) fetchSession();
  }, [user, sessionId]);

  // Use mock data as fallback
  const transcript = session?.transcript || MOCK_TRANSCRIPT;
  const summary = session?.summary || MOCK_SUMMARY;
  const title = session?.title || "Meeting Session";
  const date = session?.date || "Loading...";
  const duration = summary.meeting_duration_estimate || session?.duration || "—";
  const participantCount = summary.participants_detected?.length || 0;
  const allSpeakers = summary.participants_detected || [...new Set(transcript.map(l => l.speaker))];

  // Simulate live bot progress (for demo)
  const simulateLive = () => {
    setBotStatus("joining");
    setTimeout(() => setBotStatus("listening"), 2000);
    setTimeout(() => setBotStatus("processing"), 5000);
    setTimeout(() => setBotStatus("done"), 7000);
  };

  const copyToClipboard = () => {
    const text = `Summary: ${summary.executive_summary}\n\nKey Decisions:\n${summary.key_decisions.map(d => `• ${d}`).join("\n")}\n\nAction Items:\n${summary.action_items.map(a => `• [${a.owner}] ${a.task} — ${a.deadline}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [activeTab]);

  if (authLoading || !user) return null;

  if (loadingSession) {
    return (
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <Link href="/" className={styles.sidebarLogo}>
            <span>⚡</span> MeetScribe
          </Link>
        </aside>
        <main className={styles.main} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            <div className="skeleton" style={{ width: 200, height: 24, margin: "0 auto 12px" }} />
            <div className="skeleton" style={{ width: 300, height: 16, margin: "0 auto" }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          <span>⚡</span> MeetScribe
        </Link>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItem}>
            <span>🏠</span> Dashboard
          </Link>
          <Link href="/dashboard" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span>📋</span> Sessions
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            <span>⭐</span> Starred
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            <span>⚙️</span> Settings
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href="/dashboard">Dashboard</Link>
          <span>›</span>
          <span>{title}</span>
        </div>

        {/* Session header */}
        <div className={styles.sessionHeader}>
          <div className={styles.sessionInfo}>
            <h1>{title}</h1>
            <div className={styles.sessionMeta}>
              <span>📅 {date}</span>
              <span>⏱ {duration}</span>
              <span>👥 {participantCount} participants</span>
            </div>
          </div>

          {/* Bot status + controls */}
          <div className={styles.botControls}>
            <div className={`card ${styles.statusCard}`}>
              <div className={styles.statusTop}>
                <span className={`badge ${STATUS_COLORS[botStatus]}`}>
                  {botStatus === "listening" && <span className="dot-pulse" />}
                  {STATUS_LABELS[botStatus]}
                </span>
                <span className={styles.botIcon}>🤖</span>
              </div>
              {botStatus === "listening" && (
                <div className={styles.waveform}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              )}
              <div className={styles.statusActions}>
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={simulateLive}>
                  ▶ Demo live
                </button>
                <button className="btn btn-danger" style={{ fontSize: 13, padding: "7px 14px" }}>
                  ⏹ Stop bot
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "transcript" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("transcript")}
          >
            🎙 Live Transcript
          </button>
          <button
            className={`${styles.tab} ${activeTab === "summary" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            ✨ AI Summary
          </button>
        </div>

        {/* Transcript tab */}
        {activeTab === "transcript" && (
          <div className={`card ${styles.transcriptCard}`} ref={transcriptRef}>
            {transcript.map((line, i) => (
              <div key={i} className={styles.transcriptLine}>
                <div className={styles.transcriptAvatar} style={{
                  background: getSpeakerColor(line.speaker, allSpeakers)
                }}>
                  {line.speaker[0]}
                </div>
                <div className={styles.transcriptContent}>
                  <div className={styles.transcriptMeta}>
                    <span className={styles.speakerName}>{line.speaker}</span>
                    <span className={styles.speakerTime}>{line.time}</span>
                  </div>
                  <p>{line.text}</p>
                </div>
              </div>
            ))}
            <div className={styles.transcriptEnd}>
              <span className="badge badge-green">
                <span className="dot-pulse" />
                Meeting concluded — Summary generated
              </span>
            </div>
          </div>
        )}

        {/* Summary tab */}
        {activeTab === "summary" && (
          <div className={styles.summaryGrid}>
            {/* Executive Summary */}
            <div className={`card ${styles.summaryCard} ${styles.summaryFull}`}>
              <div className={styles.cardHeader}>
                <h2>✨ Executive Summary</h2>
                <button className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={copyToClipboard}>
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </button>
              </div>
              <p className={styles.summaryText}>{summary.executive_summary}</p>
              <div className={styles.summaryMeta}>
                {summary.main_topics.map((t) => (
                  <span key={t} className="badge badge-purple">{t}</span>
                ))}
                <span className={`badge ${summary.sentiment === "positive" ? "badge-green" : "badge-amber"}`}>
                  {summary.sentiment === "positive" ? "😊 Positive sentiment" : summary.sentiment === "negative" ? "😟 Negative sentiment" : "😐 Neutral sentiment"}
                </span>
              </div>
            </div>

            {/* Key Decisions */}
            <div className={`card ${styles.summaryCard}`}>
              <div className={styles.cardHeader}><h2>🔑 Key Decisions</h2></div>
              <ul className={styles.decisionList}>
                {summary.key_decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className={`card ${styles.summaryCard}`}>
              <div className={styles.cardHeader}>
                <h2>✅ Action Items</h2>
                <span className="badge badge-amber">{summary.action_items.length} items</span>
              </div>
              <div className={styles.actionList}>
                {summary.action_items.map((a, i) => (
                  <div key={i} className={styles.actionItem}>
                    <div className={styles.actionOwner}>{a.owner[0]}</div>
                    <div className={styles.actionContent}>
                      <span className={styles.actionTask}>{a.task}</span>
                      <span className={styles.actionDeadline}>📅 {a.deadline}</span>
                    </div>
                    <span className="badge badge-purple">{a.owner}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div className={`card ${styles.summaryCard} ${styles.summarySmall}`}>
              <div className={styles.cardHeader}><h2>👥 Participants</h2></div>
              <div className={styles.participantList}>
                {allSpeakers.map((p) => (
                  <div key={p} className={styles.participant}>
                    <div className={styles.participantAvatar} style={{
                      background: getSpeakerColor(p, allSpeakers)
                    }}>{p[0]}</div>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

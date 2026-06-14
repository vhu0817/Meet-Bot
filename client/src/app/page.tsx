"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./page.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const [meetLink, setMeetLink] = useState("");

  const features = [
    {
      icon: "🤖",
      title: "Autonomous bot",
      desc: "Paste a Meet link and a managed bot joins instantly — no downloads, no browser extension.",
    },
    {
      icon: "🎙️",
      title: "Speaker-aware transcripts",
      desc: "Real-time diarized transcription, attributing every line to who actually said it.",
    },
    {
      icon: "✨",
      title: "Structured AI summaries",
      desc: "Gemini 2.5 Flash distills each call into decisions, action items, topics, and sentiment.",
    },
    {
      icon: "💬",
      title: "Ask your meetings",
      desc: "RAG-powered search across every transcript — ask a question, get answers with citations.",
    },
  ];

  const stats = [
    { value: "< 10s", label: "Bot join time" },
    { value: "RAG", label: "Cross-meeting search" },
    { value: "Gemini 2.5", label: "AI model" },
    { value: "Free", label: "Forever plan" },
  ];

  return (
    <main className={styles.main}>
      {/* Animated aurora background */}
      <div className={styles.aurora}>
        <div className={`${styles.auroraBlob} ${styles.blob1}`} />
        <div className={`${styles.auroraBlob} ${styles.blob2}`} />
        <div className={`${styles.auroraBlob} ${styles.blob3}`} />
      </div>
      <div className={styles.grid} />

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={`container ${styles.navInner}`}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>MeetScribe</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how" className={styles.navLink}>How it works</a>
            <Link href="/login" className="btn btn-ghost" style={{ padding: "8px 18px" }}>Sign in</Link>
            <Link href="/signup" className="btn btn-primary" style={{ padding: "8px 18px" }}>Get started →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          className={`container ${styles.heroContent}`}
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12 }}
        >
          <motion.div className={styles.heroBadge} variants={fadeUp} transition={{ duration: 0.5 }}>
            <span className="badge badge-purple">
              <span className="dot-pulse" />
              Powered by Gemini 2.5 Flash · RAG
            </span>
          </motion.div>
          <motion.h1 className={styles.heroTitle} variants={fadeUp} transition={{ duration: 0.5 }}>
            Your AI scribe for<br />
            <span className="gradient-text">every Google Meet</span>
          </motion.h1>
          <motion.p className={styles.heroSub} variants={fadeUp} transition={{ duration: 0.5 }}>
            Drop in a meeting link. A bot joins, transcribes, and delivers a structured
            summary with action items — then lets you ask questions across all your meetings.
          </motion.p>

          <motion.div className={styles.heroForm} variants={fadeUp} transition={{ duration: 0.5 }}>
            <input
              className={`input ${styles.heroInput}`}
              type="text"
              placeholder="Paste Google Meet link — e.g. meet.google.com/abc-defg-hij"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
            />
            <Link href="/signup" className={`btn btn-primary ${styles.heroBtn}`}>
              Launch Bot →
            </Link>
          </motion.div>
          <motion.p className={styles.heroHint} variants={fadeUp} transition={{ duration: 0.5 }}>
            Free to use · No credit card · Sign up takes 30 seconds
          </motion.p>
        </motion.div>

        {/* Floating product mockup */}
        <motion.div
          className={styles.mockup}
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <div className={`glass ${styles.mockupWindow}`}>
            <div className={styles.mockupBar}>
              <span className={styles.dot} style={{ background: "#ef4444" }} />
              <span className={styles.dot} style={{ background: "#f59e0b" }} />
              <span className={styles.dot} style={{ background: "#22c55e" }} />
              <span className={styles.mockupTitle}>MeetScribe — Live</span>
              <span className={`badge badge-green ${styles.recBadge}`}>
                <span className="dot-pulse" /> Recording
              </span>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.transcriptCol}>
                {[
                  { who: "Sarah", color: "#6366f1", text: "Let's lock down the Q2 priorities today." },
                  { who: "Mike", color: "#22c55e", text: "Onboarding refactor is the highest-ROI item." },
                  { who: "Alex", color: "#f59e0b", text: "Design already has the mockups ready to go." },
                  { who: "Sarah", color: "#6366f1", text: "Mike, send me the API timeline by Friday." },
                ].map((l, i) => (
                  <motion.div
                    key={i}
                    className={styles.line}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.25, duration: 0.4 }}
                  >
                    <span className={styles.avatar} style={{ background: l.color }}>{l.who[0]}</span>
                    <div>
                      <span className={styles.lineWho}>{l.who}</span>
                      <p className={styles.lineText}>{l.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div
                className={styles.summaryCol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.1, duration: 0.6 }}
              >
                <div className={styles.summaryHead}>
                  <span>✨</span> AI Summary
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Decision</span>
                  <p>Onboarding refactor set as Q2 priority</p>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Action item</span>
                  <p><b>Mike</b> · API timeline draft · <span className={styles.due}>Fri</span></p>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Sentiment</span>
                  <p><span className="badge badge-green">Positive</span></p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className={`container ${styles.statsWrap}`}>
          <div className={styles.statsRow}>
            {stats.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className="container">
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2>Everything you need</h2>
            <p>Built for teams that move fast and can&apos;t afford to miss context.</p>
          </motion.div>
          <div className={styles.featureGrid}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className={`card ${styles.featureCard}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className={styles.howSection}>
        <div className="container">
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2>How it works</h2>
            <p>Three simple steps. Zero friction.</p>
          </motion.div>
          <div className={styles.steps}>
            {[
              { n: "01", title: "Paste your Meet link", desc: "Copy the link from your Google Calendar invite or Meet tab." },
              { n: "02", title: "Bot joins automatically", desc: "A managed bot enters the meeting, announces itself, and starts listening." },
              { n: "03", title: "Get your summary — and ask anything", desc: "Receive a structured summary in seconds, then query across all past meetings." },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                className={styles.step}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className={styles.stepNum}>{step.n}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className="container">
          <motion.div
            className={`card ${styles.ctaCard}`}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2>Ready to scribe smarter?</h2>
            <p>Join now and never lose track of a meeting again.</p>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: "16px", padding: "14px 32px" }}>
              Create free account →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <span className={styles.logoText} style={{ opacity: 0.5 }}>⚡ MeetScribe</span>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Built with Gemini 2.5 · Firebase · Recall.ai</p>
        </div>
      </footer>
    </main>
  );
}

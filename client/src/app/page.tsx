"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  const [meetLink, setMeetLink] = useState("");

  const features = [
    {
      icon: "🤖",
      title: "Smart Bot Joining",
      desc: "Paste a Meet link and our bot joins instantly — no downloads, no setup.",
    },
    {
      icon: "🎙️",
      title: "Live Transcription",
      desc: "Real-time, speaker-aware transcription powered by Google Speech-to-Text.",
    },
    {
      icon: "✨",
      title: "AI Summaries",
      desc: "Gemini 2.0 Flash generates concise summaries, action items, and key decisions.",
    },
    {
      icon: "☁️",
      title: "Cloud Storage",
      desc: "Every transcript and summary is securely stored and accessible anytime.",
    },
  ];

  const stats = [
    { value: "< 10s", label: "Bot join time" },
    { value: "98%", label: "Transcription accuracy" },
    { value: "Gemini 2.0", label: "AI model" },
    { value: "Free", label: "Forever plan" },
  ];

  return (
    <main className={styles.main}>
      {/* Background orbs */}
      <div className="orb orb-purple" />
      <div className="orb orb-blue" />

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
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroBadge}>
            <span className="badge badge-purple">
              <span className="dot-pulse" />
              Powered by Gemini 2.0 Flash
            </span>
          </div>
          <h1 className={styles.heroTitle}>
            Your AI scribe for<br />
            <span className="gradient-text">every Google Meet</span>
          </h1>
          <p className={styles.heroSub}>
            Drop in a meeting link. Our bot joins, listens, and delivers a perfect
            summary with action items — so you never miss what matters.
          </p>

          {/* Quick try */}
          <div className={styles.heroForm}>
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
          </div>
          <p className={styles.heroHint}>Free to use · No credit card · Sign up takes 30 seconds</p>

          {/* Stats row */}
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
          <div className={styles.sectionHeader}>
            <h2>Everything you need</h2>
            <p>Built for teams that move fast and can't afford to miss context.</p>
          </div>
          <div className={styles.featureGrid}>
            {features.map((f) => (
              <div key={f.title} className={`card ${styles.featureCard}`}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className={styles.howSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>How it works</h2>
            <p>Three simple steps. Zero friction.</p>
          </div>
          <div className={styles.steps}>
            {[
              { n: "01", title: "Paste your Meet link", desc: "Copy the link from your Google Calendar invite or Meet tab." },
              { n: "02", title: "Bot joins automatically", desc: "Our AI bot enters the meeting, announces itself, and starts listening." },
              { n: "03", title: "Get your summary", desc: "When the meeting ends, receive a full summary with action items in seconds." },
            ].map((step) => (
              <div key={step.n} className={styles.step}>
                <div className={styles.stepNum}>{step.n}</div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className="container">
          <div className={`card ${styles.ctaCard}`}>
            <h2>Ready to scribe smarter?</h2>
            <p>Join now and never lose track of a meeting again.</p>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: "16px", padding: "14px 32px" }}>
              Create free account →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <span className={styles.logoText} style={{ opacity: 0.5 }}>⚡ MeetScribe</span>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Built with Gemini 2.0 · Firebase · Recall.ai</p>
        </div>
      </footer>
    </main>
  );
}

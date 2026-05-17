// ─────────────────────────────────────────────────────────────
// Session Routes — /api/sessions/*
// ─────────────────────────────────────────────────────────────
// CRUD endpoints for meeting sessions, backed by Firestore.
// If Firestore isn't configured, falls back to mock data.
//
// Endpoints:
//   GET    /api/sessions       → list all sessions for a user
//   GET    /api/sessions/:id   → get a single session's details
//   POST   /api/sessions       → create a new session
//   DELETE /api/sessions/:id   → delete a session
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { db } = require("../config/firebase");

// ── Mock data (used when Firestore isn't configured) ────────
const MOCK_SESSIONS = [
  {
    id: "s1",
    title: "Q2 Product Roadmap Review",
    date: "May 5, 2026 · 10:00 AM",
    duration: "52 min",
    participants: 6,
    status: "completed",
    summary: "Discussed feature prioritization for Q2. Team agreed to focus on onboarding improvements and API v2 launch.",
    actionItems: 4,
    createdAt: new Date("2026-05-05T10:00:00").toISOString(),
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
    createdAt: new Date("2026-05-05T09:00:00").toISOString(),
  },
  {
    id: "s3",
    title: "Investor Demo Prep",
    date: "May 4, 2026 · 3:00 PM",
    duration: "1h 14min",
    participants: 3,
    status: "completed",
    summary: "Finalized slide deck structure. Sarah to revise market sizing slide. Demo flow rehearsed twice.",
    actionItems: 5,
    createdAt: new Date("2026-05-04T15:00:00").toISOString(),
  },
  {
    id: "s4",
    title: "Design Review — Mobile App",
    date: "May 3, 2026 · 2:30 PM",
    duration: "38 min",
    participants: 5,
    status: "completed",
    summary: "Approved new navigation patterns. Dark mode implementation to begin next sprint.",
    actionItems: 3,
    createdAt: new Date("2026-05-03T14:30:00").toISOString(),
  },
];

const MOCK_SESSION_DETAIL = {
  title: "Q2 Product Roadmap Review",
  date: "May 5, 2026 · 10:00 AM",
  duration: "52 min",
  status: "completed",
  transcript: [
    { speaker: "Sarah", time: "10:02", text: "Alright, let's kick things off. Can everyone hear me okay?" },
    { speaker: "Mike", time: "10:02", text: "Yeah, audio is clear on my end." },
    { speaker: "Alex", time: "10:03", text: "Same here. I'll share my screen in a second — I've got the roadmap doc open." },
    { speaker: "Sarah", time: "10:04", text: "Perfect. So the main goal today is to lock down priorities for Q2." },
    { speaker: "Mike", time: "10:05", text: "From the engineering side, the onboarding flow refactor is the highest ROI item." },
    { speaker: "Alex", time: "10:07", text: "I agree with Mike on the onboarding piece. Design already has mockups ready." },
    { speaker: "Sarah", time: "10:08", text: "Great. Let's mark that as P1. What about the API v2 launch?" },
    { speaker: "Mike", time: "10:10", text: "API v2 is 80% done. We need two more weeks to stabilize the auth endpoints." },
    { speaker: "Sarah", time: "10:11", text: "Okay, that's P1 as well. Mike can you own the API launch timeline? Send me a draft by Friday." },
    { speaker: "Mike", time: "10:11", text: "On it. Friday works." },
  ],
  summary: {
    executive_summary: "The Q2 product roadmap review aligned the team on top priorities. Onboarding flow refactor and API v2 launch were confirmed as P1 items.",
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
  },
};

// ─────────────────────────────────────────────────────────────
// GET /api/sessions
// Returns all sessions for the logged-in user.
// ─────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    // If Firestore isn't configured, return mock data
    if (!db) {
      return res.json({ sessions: MOCK_SESSIONS });
    }

    let snapshot;
    try {
      // Try the full query with ordering
      snapshot = await db
        .collection("sessions")
        .where("userId", "==", req.user.uid)
        .orderBy("createdAt", "desc")
        .get();
    } catch (indexErr) {
      // If it fails (missing composite index), try without orderBy
      console.warn("⚠️ Firestore composite index needed:", indexErr.message);
      console.warn("   Create it at the URL in the error above ^^^");
      snapshot = await db
        .collection("sessions")
        .where("userId", "==", req.user.uid)
        .get();
    }

    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort in-memory if Firestore couldn't do it
    sessions.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    console.log(`📋 Returned ${sessions.length} sessions for ${req.user.email}`);
    res.json({ sessions });
  } catch (error) {
    console.error("Sessions list error:", error.message || error);
    // Only fall back to mock data as last resort
    res.json({ sessions: MOCK_SESSIONS });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sessions/:id
// Returns full details of a single session (transcript + summary).
// ─────────────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // If Firestore isn't configured, return mock data
    if (!db) {
      return res.json({ session: { id, ...MOCK_SESSION_DETAIL } });
    }

    const doc = await db.collection("sessions").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = { id: doc.id, ...doc.data() };

    // Verify the session belongs to the requesting user
    if (session.userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ session });
  } catch (error) {
    console.error("Session detail error:", error);
    res.json({ session: { id: req.params.id, ...MOCK_SESSION_DETAIL } });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sessions
// Create a new session (typically called after a bot finishes).
// ─────────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, meetLink, transcript, summary, duration, participants } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const sessionData = {
      userId: req.user.uid,
      userEmail: req.user.email,
      title,
      meetLink: meetLink || null,
      transcript: transcript || [],
      summary: summary || null,
      duration: duration || "Unknown",
      participants: participants || 0,
      status: summary ? "completed" : "processing",
      actionItems: summary?.action_items?.length || 0,
      date: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      createdAt: new Date().toISOString(),
    };

    if (!db) {
      // If Firestore isn't configured, return mock response
      const mockId = "s_" + Date.now();
      console.log(`📝 [MOCK] Session created: ${title}`);
      return res.json({ success: true, session: { id: mockId, ...sessionData } });
    }

    const docRef = await db.collection("sessions").add(sessionData);
    console.log(`📝 Session created: ${docRef.id} — "${title}"`);

    res.json({ success: true, session: { id: docRef.id, ...sessionData } });
  } catch (error) {
    console.error("Session create error:", error.message || error);
    // If Firestore fails (e.g. database not created yet), return a mock session
    // so the frontend flow doesn't crash
    const { title, meetLink, transcript, summary, duration, participants } = req.body;
    const fallbackId = "local_" + Date.now();
    console.warn(`⚠️ Firestore save failed, returning fallback session ${fallbackId}`);
    res.json({
      success: true,
      session: {
        id: fallbackId,
        userId: req.user.uid,
        title: title || "Untitled Meeting",
        meetLink, transcript, summary, duration, participants,
        status: summary ? "completed" : "processing",
        actionItems: summary?.action_items?.length || 0,
        date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
        createdAt: new Date().toISOString(),
        firestoreError: error.message,
      },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/sessions/:id
// Delete a session and its associated data.
// ─────────────────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!db) {
      console.log(`🗑️ [MOCK] Session ${id} deleted`);
      return res.json({ success: true, id });
    }

    // Verify ownership before deleting
    const doc = await db.collection("sessions").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.collection("sessions").doc(id).delete();
    console.log(`🗑️ Session ${id} deleted`);
    res.json({ success: true, id });
  } catch (error) {
    console.error("Session delete error:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

module.exports = router;

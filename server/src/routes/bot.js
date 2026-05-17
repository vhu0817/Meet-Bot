// ─────────────────────────────────────────────────────────────
// Bot Routes — /api/bot/*
// ─────────────────────────────────────────────────────────────
// These endpoints control the meeting bot via Recall.ai:
//   POST /api/bot/start        → deploy a bot to join a Google Meet
//   GET  /api/bot/status/:id   → check the bot's current status
//   POST /api/bot/stop/:id     → remove the bot from the meeting
//   GET  /api/bot/transcript/:id → get the transcript after meeting
//
// The full bot lifecycle:
//   1. User pastes a Meet link → POST /api/bot/start
//   2. Frontend polls status   → GET  /api/bot/status/:id
//   3. User clicks stop        → POST /api/bot/stop/:id
//   4. Fetch transcript        → GET  /api/bot/transcript/:id
//   5. Send to Gemini          → POST /api/summarize (separate route)
//   6. Save session            → POST /api/sessions (separate route)
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const recallService = require("../services/recall");
const geminiService = require("../services/gemini");

// ─────────────────────────────────────────────────────────────
// POST /api/bot/start
// Deploy a bot to join a Google Meet meeting.
// Body: { meetLink: "https://meet.google.com/abc-defg-hij" }
// ─────────────────────────────────────────────────────────────
router.post("/start", requireAuth, async (req, res) => {
  try {
    const { meetLink } = req.body;

    if (!meetLink) {
      return res.status(400).json({ error: "meetLink is required" });
    }

    // Validate Google Meet link format
    const meetPattern = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
    if (!meetPattern.test(meetLink)) {
      return res.status(400).json({ error: "Invalid Google Meet link format. Expected: meet.google.com/abc-defg-hij" });
    }

    console.log(`🤖 Bot deployment requested by ${req.user.email} for: ${meetLink}`);

    const bot = await recallService.createBot(meetLink, "MeetScribe Bot");

    res.json({ success: true, bot });
  } catch (error) {
    console.error("Bot start error:", error.message);
    res.status(500).json({ error: error.message || "Failed to start bot" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/bot/status/:id
// Check the current status of a deployed bot.
// Returns: { id, status, statusChanges, meetingUrl }
// ─────────────────────────────────────────────────────────────
router.get("/status/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const status = await recallService.getBotStatus(id);
    res.json(status);
  } catch (error) {
    console.error("Bot status error:", error.message);
    res.status(500).json({ error: "Failed to get bot status" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/bot/stop/:id
// Remove the bot from the meeting. Irreversible.
// ─────────────────────────────────────────────────────────────
router.post("/stop/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🛑 Bot ${id} stop requested by ${req.user.email}`);

    const result = await recallService.stopBot(id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Bot stop error:", error.message);
    res.status(500).json({ error: "Failed to stop bot" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/bot/transcript/:id
// Get the transcript for a completed bot session.
// Optionally auto-summarize with Gemini.
// Query params:
//   ?summarize=true → also run Gemini summarization
// ─────────────────────────────────────────────────────────────
router.get("/transcript/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const shouldSummarize = req.query.summarize === "true";

    console.log(`📝 Fetching transcript for bot ${id}`);

    const transcript = await recallService.getTranscript(id);

    const result = { success: true, transcript };

    // Optionally auto-summarize (non-blocking — if Gemini fails, still return transcript)
    if (shouldSummarize && transcript.length > 0) {
      try {
        console.log(`✨ Auto-summarizing ${transcript.length} lines`);
        const summary = await geminiService.summarize(transcript);
        result.summary = summary;
      } catch (summaryErr) {
        console.warn("⚠️ Gemini summarization failed (returning transcript without summary):", summaryErr.message);
        result.summary = null;
        result.summaryError = summaryErr.message;
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Bot transcript error:", error.message);
    res.status(500).json({ error: error.message || "Failed to get transcript" });
  }
});

module.exports = router;

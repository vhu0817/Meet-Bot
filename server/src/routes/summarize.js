// ─────────────────────────────────────────────────────────────
// Summarize Routes — /api/summarize/*
// ─────────────────────────────────────────────────────────────
// Endpoints:
//   POST /api/summarize → send a transcript, get back a summary
//
// This is now wired to the real Gemini 2.0 Flash service.
// If GEMINI_API_KEY is not set, it falls back to mock data.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const geminiService = require("../services/gemini");

// POST /api/summarize
// Frontend sends: { transcript: [...] }
// Backend sends transcript to Gemini and returns structured summary.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: "transcript array is required" });
    }

    console.log(`✨ Summarizing ${transcript.length} transcript lines for user ${req.user.uid}`);

    const summary = await geminiService.summarize(transcript);

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Summarize error:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

module.exports = router;

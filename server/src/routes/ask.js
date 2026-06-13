const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const rag = require("../services/rag");

// POST /api/ask  { question }
// Retrieval-augmented Q&A across the user's own meeting transcripts.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { question, topK } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const k = Math.min(Math.max(parseInt(topK, 10) || 5, 1), 10);
    const result = await rag.ask(req.user.uid, question.trim(), k);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Ask error:", error.message || error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

module.exports = router;

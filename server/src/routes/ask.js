const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { db } = require("../config/firebase");
const rag = require("../services/rag");

const COLLECTION = "conversations";

// POST /api/ask  { question }
// Retrieval-augmented Q&A across the user's own meeting transcripts.
// Persists each turn so the Ask page can show history.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { question, topK } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const k = Math.min(Math.max(parseInt(topK, 10) || 5, 1), 10);
    const result = await rag.ask(req.user.uid, question.trim(), k);

    let id = null;
    if (db) {
      try {
        const ref = await db.collection(COLLECTION).add({
          userId: req.user.uid,
          question: question.trim(),
          answer: result.answer,
          sources: result.sources || [],
          createdAt: new Date().toISOString(),
        });
        id = ref.id;
      } catch (e) {
        console.warn("⚠️ Could not save conversation:", e.message);
      }
    }

    res.json({ success: true, id, ...result });
  } catch (error) {
    console.error("Ask error:", error.message || error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

// GET /api/ask/history — past Q&A for this user, newest first.
router.get("/history", requireAuth, async (req, res) => {
  try {
    if (!db) return res.json({ history: [] });

    let snapshot;
    try {
      snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", req.user.uid)
        .orderBy("createdAt", "desc")
        .get();
    } catch (indexErr) {
      console.warn("⚠️ conversations index needed:", indexErr.message);
      snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", req.user.uid)
        .get();
    }

    const history = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    history.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    res.json({ history });
  } catch (error) {
    console.error("History error:", error.message || error);
    res.json({ history: [] });
  }
});

// DELETE /api/ask/history/:id — remove one saved Q&A.
router.delete("/history/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) return res.json({ success: true, id });

    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.collection(COLLECTION).doc(id).delete();
    res.json({ success: true, id });
  } catch (error) {
    console.error("History delete error:", error.message || error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

module.exports = router;

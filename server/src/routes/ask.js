const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const { db } = require("../config/firebase");
const rag = require("../services/rag");

const COLLECTION = "conversations";

// POST /api/ask  { question, topK?, conversationId? }
// Starts a new conversation or appends a turn to an existing one. Returns the
// answer plus the conversation id/title so the sidebar can track threads.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { question, topK, conversationId } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const k = Math.min(Math.max(parseInt(topK, 10) || 5, 1), 10);
    const q = question.trim();

    // Load prior turns if continuing a thread (for follow-up context + ownership).
    let convDoc = null;
    let priorTurns = [];
    if (conversationId && db) {
      const snap = await db.collection(COLLECTION).doc(conversationId).get();
      if (snap.exists && snap.data().userId === req.user.uid) {
        convDoc = snap;
        priorTurns = snap.data().turns || [];
      }
    }

    const result = await rag.ask(req.user.uid, q, k, priorTurns);
    const now = new Date().toISOString();

    const userTurn = { role: "user", text: q, createdAt: now };
    const assistantTurn = {
      role: "assistant",
      text: result.answer,
      sources: result.sources || [],
      createdAt: now,
    };

    let id = conversationId || null;
    let title = convDoc ? convDoc.data().title : q.slice(0, 60);

    if (db) {
      try {
        if (convDoc) {
          await db.collection(COLLECTION).doc(id).update({
            turns: [...priorTurns, userTurn, assistantTurn],
            updatedAt: now,
          });
        } else {
          const ref = await db.collection(COLLECTION).add({
            userId: req.user.uid,
            title,
            turns: [userTurn, assistantTurn],
            createdAt: now,
            updatedAt: now,
          });
          id = ref.id;
        }
      } catch (e) {
        console.warn("⚠️ Could not persist conversation:", e.message);
      }
    }

    res.json({ success: true, conversationId: id, title, ...result });
  } catch (error) {
    console.error("Ask error:", error.message || error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

// GET /api/ask/conversations — thread list for the sidebar (no full turns).
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    if (!db) return res.json({ conversations: [] });

    let snapshot;
    try {
      snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", req.user.uid)
        .orderBy("updatedAt", "desc")
        .get();
    } catch (indexErr) {
      console.warn("⚠️ conversations index needed:", indexErr.message);
      snapshot = await db
        .collection(COLLECTION)
        .where("userId", "==", req.user.uid)
        .get();
    }

    const conversations = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || "Untitled",
        updatedAt: d.updatedAt || d.createdAt,
        turnCount: (d.turns || []).length,
      };
    });
    conversations.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    res.json({ conversations });
  } catch (error) {
    console.error("Conversations list error:", error.message || error);
    res.json({ conversations: [] });
  }
});

// GET /api/ask/conversations/:id — full thread with all turns.
router.get("/conversations/:id", requireAuth, async (req, res) => {
  try {
    if (!db) return res.json({ conversation: null });

    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ conversation: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Conversation get error:", error.message || error);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// DELETE /api/ask/conversations/:id
router.delete("/conversations/:id", requireAuth, async (req, res) => {
  try {
    if (!db) return res.json({ success: true, id: req.params.id });

    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: "Access denied" });
    }

    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error("Conversation delete error:", error.message || error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

module.exports = router;

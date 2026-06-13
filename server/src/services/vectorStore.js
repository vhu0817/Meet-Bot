const { db } = require("../config/firebase");
const embeddings = require("./embeddings");

const CHUNKS_COLLECTION = "chunks";

// Index a session's transcript into the vector store. Best-effort: failures are
// logged but never bubble up, matching how summarization is treated downstream.
async function indexSession({ sessionId, userId, title, transcript }) {
  if (!db) {
    console.log("⚠️ Firestore not configured — skipping embedding index");
    return { indexed: 0 };
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return { indexed: 0 };
  }

  try {
    const chunks = embeddings.chunkTranscript(transcript);
    if (chunks.length === 0) return { indexed: 0 };

    const vectors = await embeddings.embedBatch(chunks.map((c) => c.text));

    const batch = db.batch();
    chunks.forEach((chunk, i) => {
      const ref = db.collection(CHUNKS_COLLECTION).doc();
      batch.set(ref, {
        sessionId,
        userId,
        sessionTitle: title || "Untitled Meeting",
        text: chunk.text,
        startTime: chunk.startTime,
        speakers: chunk.speakers,
        embedding: vectors[i],
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    console.log(`🧠 Indexed ${chunks.length} chunks for session ${sessionId}`);
    return { indexed: chunks.length };
  } catch (error) {
    console.error("❌ Embedding index error:", error.message || error);
    return { indexed: 0, error: error.message };
  }
}

async function deleteSessionChunks(sessionId) {
  if (!db || !sessionId) return;
  try {
    const snapshot = await db
      .collection(CHUNKS_COLLECTION)
      .where("sessionId", "==", sessionId)
      .get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`🧹 Removed ${snapshot.size} chunks for session ${sessionId}`);
  } catch (error) {
    console.error("❌ Chunk cleanup error:", error.message || error);
  }
}

module.exports = { indexSession, deleteSessionChunks, CHUNKS_COLLECTION };

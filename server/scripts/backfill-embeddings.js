// One-off backfill: embeds transcripts for sessions created before the RAG
// feature existed. Run from the server/ directory:  node scripts/backfill-embeddings.js
require("dotenv").config();

const { db } = require("../src/config/firebase");
const vectorStore = require("../src/services/vectorStore");

async function main() {
  if (!db) {
    console.error("Firestore not configured — set up firebase-service-account first.");
    process.exit(1);
  }

  const sessions = await db.collection("sessions").get();
  console.log(`Found ${sessions.size} sessions.`);

  let done = 0;
  let skipped = 0;

  for (const doc of sessions.docs) {
    const data = doc.data();

    const existing = await db
      .collection(vectorStore.CHUNKS_COLLECTION)
      .where("sessionId", "==", doc.id)
      .limit(1)
      .get();
    if (!existing.empty) {
      skipped++;
      continue;
    }

    const { indexed } = await vectorStore.indexSession({
      sessionId: doc.id,
      userId: data.userId,
      title: data.title,
      transcript: data.transcript || [],
    });
    if (indexed > 0) done++;
  }

  console.log(`\nBackfill complete: ${done} indexed, ${skipped} already done.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

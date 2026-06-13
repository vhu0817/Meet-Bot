const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require("../config/firebase");
const embeddings = require("./embeddings");
const { CHUNKS_COLLECTION } = require("./vectorStore");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let model = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here") {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

const ANSWER_PROMPT = `You are MeetScribe's assistant. Answer the user's question using ONLY the meeting excerpts provided as context. Each excerpt is tagged with a source number like [1], [2].

Rules:
- Base your answer strictly on the excerpts. If they don't contain the answer, say you couldn't find it in the meetings.
- Cite the source numbers you used inline, e.g. "The team chose Postgres [2]".
- Be concise and direct. Do not invent names, dates, or decisions that aren't in the excerpts.`;

// Pull this user's chunks and rank them against the question vector in-process.
// Fine for a personal-scale corpus; a managed vector DB would replace this at scale.
async function retrieve(userId, question, topK = 5) {
  if (!db) return [];

  const snapshot = await db
    .collection(CHUNKS_COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return [];

  const queryVec = await embeddings.embedText(question);

  const scored = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      sessionId: d.sessionId,
      title: d.sessionTitle,
      time: d.startTime,
      text: d.text,
      score: embeddings.cosineSimilarity(queryVec, d.embedding || []),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function buildContext(chunks) {
  return chunks
    .map((c, i) => `[${i + 1}] (Meeting: "${c.title}", time ${c.time})\n${c.text}`)
    .join("\n\n");
}

async function ask(userId, question, topK = 5) {
  const chunks = await retrieve(userId, question, topK);

  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find anything in your meetings yet. Once you've recorded and saved a few sessions, ask me again.",
      sources: [],
    };
  }

  const sources = chunks.map((c, i) => ({
    n: i + 1,
    sessionId: c.sessionId,
    title: c.title,
    time: c.time,
    snippet: c.text.length > 240 ? c.text.slice(0, 240) + "…" : c.text,
    score: Number(c.score.toFixed(3)),
  }));

  if (!model) {
    // No API key: still return the retrieved evidence so the UI is usable.
    return {
      answer:
        "AI answering is disabled (no GEMINI_API_KEY), but here are the most relevant moments from your meetings. See the sources below.",
      sources,
    };
  }

  const prompt = `${ANSWER_PROMPT}\n\nContext:\n${buildContext(chunks)}\n\nQuestion: ${question}\n\nAnswer:`;

  try {
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    return { answer, sources };
  } catch (error) {
    console.error("❌ RAG answer error:", error.message);
    return {
      answer:
        "I found relevant excerpts but couldn't generate an answer just now. See the sources below.",
      sources,
    };
  }
}

module.exports = { ask, retrieve };

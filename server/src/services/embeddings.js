const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EMBEDDING_DIM = 768;
const EMBEDDING_MODEL = "gemini-embedding-001";

let genAI = null;
let embeddingModel = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here") {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  console.log(`✅ Embeddings initialized (${EMBEDDING_MODEL}, ${EMBEDDING_DIM}d)`);
} else {
  console.warn("⚠️  Gemini API key not set — embeddings will use mock vectors");
}

function isConfigured() {
  return !!embeddingModel;
}

function l2normalize(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

// Deterministic stand-in so the RAG flow still works without an API key.
function mockEmbedding(text) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const tokens = String(text).toLowerCase().split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) & 0x7fffffff;
    }
    vec[hash % EMBEDDING_DIM] += 1;
  }
  return l2normalize(vec);
}

async function embedText(text) {
  if (!embeddingModel) {
    return mockEmbedding(text);
  }
  try {
    const result = await embeddingModel.embedContent({
      content: { parts: [{ text: String(text) }] },
      outputDimensionality: EMBEDDING_DIM,
    });
    const values = result?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      return mockEmbedding(text);
    }
    // Truncated Matryoshka vectors aren't unit-length — normalize so cosine
    // stays consistent with the (already normalized) mock fallback.
    return l2normalize(values);
  } catch (error) {
    console.error("❌ Embedding error:", error.message);
    return mockEmbedding(text);
  }
}

async function embedBatch(texts) {
  const out = [];
  for (const text of texts) {
    out.push(await embedText(text));
  }
  return out;
}

function timeToSeconds(time) {
  if (!time || typeof time !== "string") return 0;
  const parts = time.split(":").map((p) => parseInt(p, 10) || 0);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// Bundle a few consecutive lines per chunk so each vector carries enough
// context to answer a question without getting too coarse to be precise.
function chunkTranscript(transcript, opts = {}) {
  const maxChars = opts.maxChars || 900;
  const maxLines = opts.maxLines || 6;

  if (!Array.isArray(transcript) || transcript.length === 0) return [];

  const chunks = [];
  let current = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    const text = current
      .map((l) => `[${l.time}] ${l.speaker}: ${l.text}`)
      .join("\n");
    const speakers = [...new Set(current.map((l) => l.speaker))];
    chunks.push({
      text,
      startTime: current[0].time || "0:00",
      speakers,
      lineCount: current.length,
    });
    current = [];
    currentChars = 0;
  };

  for (const line of transcript) {
    const lineText = `[${line.time}] ${line.speaker}: ${line.text}`;
    if (
      current.length > 0 &&
      (current.length >= maxLines || currentChars + lineText.length > maxChars)
    ) {
      flush();
    }
    current.push(line);
    currentChars += lineText.length;
  }
  flush();

  return chunks;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

module.exports = {
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  isConfigured,
  embedText,
  embedBatch,
  chunkTranscript,
  cosineSimilarity,
  timeToSeconds,
};

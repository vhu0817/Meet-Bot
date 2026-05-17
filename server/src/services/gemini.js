// ─────────────────────────────────────────────────────────────
// Gemini AI Service — Summarization Engine
// ─────────────────────────────────────────────────────────────
// Uses Google's Gemini 2.0 Flash to process meeting transcripts
// and produce structured summaries with:
//   - Executive summary
//   - Key decisions
//   - Action items (with owner + deadline)
//   - Main topics discussed
//   - Overall sentiment
//
// The prompt instructs Gemini to return valid JSON so we can
// parse it directly and send it to the frontend.
// ─────────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Gemini client (null if no API key)
let genAI = null;
let model = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here") {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  console.log("✅ Gemini AI initialized (gemini-2.5-flash)");
} else {
  console.warn("⚠️  Gemini API key not set — summarization will use mock data");
  console.warn("   Get your key at: https://aistudio.google.com\n");
}

// The system prompt that tells Gemini exactly what format to return
const SYSTEM_PROMPT = `You are an expert meeting summarizer. You will receive a meeting transcript as an array of objects with "speaker", "time", and "text" fields.

Analyze the transcript and return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):

{
  "executive_summary": "A concise 2-3 sentence summary of the entire meeting",
  "key_decisions": ["Decision 1", "Decision 2", ...],
  "action_items": [
    {"owner": "Person Name", "task": "What they need to do", "deadline": "When (if mentioned, otherwise 'TBD')"}
  ],
  "main_topics": ["Topic 1", "Topic 2", ...],
  "sentiment": "positive" | "neutral" | "negative",
  "participants_detected": ["Name1", "Name2", ...],
  "meeting_duration_estimate": "estimated duration based on timestamps"
}

Rules:
- Extract REAL action items mentioned in the conversation, not made up ones
- Detect actual participants from speaker names in the transcript
- Sentiment should reflect the overall tone of the meeting
- Keep the executive summary concise but informative
- If no clear deadline is mentioned for an action item, use "TBD"
- Return ONLY valid JSON, no explanations or markdown`;

/**
 * Summarize a meeting transcript using Gemini 2.0 Flash
 * @param {Array<{speaker: string, time: string, text: string}>} transcript
 * @returns {Promise<Object>} Structured summary
 */
async function summarize(transcript) {
  // If Gemini isn't configured, return mock data
  if (!model) {
    console.log("⚠️ Gemini not configured, returning mock summary");
    return getMockSummary(transcript);
  }

  try {
    // Format the transcript as readable text for the prompt
    const transcriptText = transcript
      .map((line) => `[${line.time}] ${line.speaker}: ${line.text}`)
      .join("\n");

    const prompt = `${SYSTEM_PROMPT}\n\nHere is the meeting transcript:\n\n${transcriptText}`;

    console.log("🤖 Calling Gemini 2.5 Flash...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("📝 Gemini raw response (first 500 chars):", text.substring(0, 500));

    // Clean up the response — extract JSON from various wrapper formats
    let cleanedText = text.trim();

    // Remove markdown code fences: ```json ... ``` or ``` ... ```
    const jsonBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1].trim();
    }

    // Try to find JSON object if there's other text around it
    if (!cleanedText.startsWith("{")) {
      const jsonStart = cleanedText.indexOf("{");
      const jsonEnd = cleanedText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
    }

    console.log("📝 Cleaned JSON (first 300 chars):", cleanedText.substring(0, 300));

    // Parse the JSON response
    const summary = JSON.parse(cleanedText);

    // Validate the required fields exist
    if (!summary.executive_summary) {
      console.warn("⚠️ Gemini response missing executive_summary, using raw response");
      summary.executive_summary = "Summary generated but missing expected format.";
    }
    if (!summary.key_decisions) summary.key_decisions = [];
    if (!summary.action_items) summary.action_items = [];

    console.log("✅ Gemini summary generated successfully");
    return summary;
  } catch (error) {
    console.error("❌ Gemini summarization error:", error.message);

    // Don't silently return mock — throw so the caller knows it failed
    throw error;
  }
}

/**
 * Fallback mock summary when Gemini isn't available
 */
function getMockSummary(transcript) {
  // Extract unique speakers from the transcript
  const speakers = [...new Set(transcript.map((l) => l.speaker))];

  return {
    executive_summary:
      "This is a mock summary — Gemini API key is not configured. " +
      "Set GEMINI_API_KEY in server/.env to enable real AI summarization.",
    key_decisions: [
      "Mock decision 1 — configure Gemini to see real analysis",
      "Mock decision 2 — real summaries extract actual decisions from your transcript",
    ],
    action_items: [
      {
        owner: speakers[0] || "Team",
        task: "Set up GEMINI_API_KEY in server/.env",
        deadline: "ASAP",
      },
    ],
    main_topics: ["Meeting Setup", "Configuration Pending"],
    sentiment: "neutral",
    participants_detected: speakers,
    meeting_duration_estimate: "Unknown",
  };
}

module.exports = { summarize };

// ─────────────────────────────────────────────────────────────
// Recall.ai Service — Meeting Bot Management
// ─────────────────────────────────────────────────────────────

const axios = require("axios");

const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_REGION = process.env.RECALL_REGION || "us-west-2";
const RECALL_BASE_URL = `https://${RECALL_REGION}.recall.ai/api/v1`;

const isConfigured = Boolean(RECALL_API_KEY && RECALL_API_KEY !== "your_recall_api_key_here");

if (isConfigured) {
  console.log("✅ Recall.ai initialized");
  console.log(`   Region: ${RECALL_REGION}`);
} else {
  console.warn("⚠️  Recall.ai API key not set — bot deployment will use mock data\n");
}

const recallAPI = axios.create({
  baseURL: RECALL_BASE_URL,
  headers: {
    Authorization: `Token ${RECALL_API_KEY}`,
    "Content-Type": "application/json",
  },
  maxRedirects: 5,
});

// ── Create Bot ──────────────────────────────────────────────
async function createBot(meetLink, botName = "MeetScribe Bot") {
  if (!isConfigured) return getMockBot(meetLink);

  try {
    const response = await recallAPI.post("/bot/", {
      meeting_url: meetLink,
      bot_name: botName,
      recording_config: {
        transcript: {
          provider: { meeting_captions: {} },
        },
      },
    });

    const bot = response.data;
    console.log(`🤖 Bot created: ${bot.id}`);

    return {
      id: bot.id,
      meetLink,
      status: mapRecallStatus(bot.status_changes),
      createdAt: bot.created_at || new Date().toISOString(),
      recallData: bot,
    };
  } catch (error) {
    console.error("Recall.ai createBot error:", error.response?.status, error.response?.data || error.message);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.meeting_url?.[0] ||
      "Failed to create bot"
    );
  }
}

// ── Get Bot Status ──────────────────────────────────────────
async function getBotStatus(botId) {
  if (!isConfigured) return { id: botId, status: "listening" };

  try {
    const response = await recallAPI.get(`/bot/${botId}/`);
    const bot = response.data;
    const status = mapRecallStatus(bot.status_changes);

    return {
      id: bot.id,
      status,
      statusChanges: bot.status_changes,
      meetingUrl: bot.meeting_url,
    };
  } catch (error) {
    console.error("Recall.ai getBotStatus error:", error.response?.status, error.response?.data || error.message);
    throw new Error("Failed to get bot status");
  }
}

// ── Stop Bot ────────────────────────────────────────────────
async function stopBot(botId) {
  if (!isConfigured) return { id: botId, status: "stopped" };

  try {
    await recallAPI.post(`/bot/${botId}/leave_call/`);
    console.log(`⏹ Bot ${botId} stopped`);
    return { id: botId, status: "stopped" };
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`Bot ${botId} already left the call`);
      return { id: botId, status: "stopped" };
    }
    console.error("Recall.ai stopBot error:", error.response?.status, error.response?.data || error.message);
    throw new Error("Failed to stop bot");
  }
}

// ── Get Transcript (NEW API) ────────────────────────────────
// The old /bot/{id}/transcript/ endpoint is DEPRECATED.
// New flow:
//   1. GET /bot/{id}/ → recordings[0].media_shortcuts.transcript
//   2. Download the JSON from transcript.data.download_url
//   3. Parse the diarized JSON into our format
// ─────────────────────────────────────────────────────────────
async function getTranscript(botId) {
  if (!isConfigured) return getMockTranscript();

  try {
    // Step 1: Get bot data to find the transcript download URL
    console.log(`📝 Fetching bot ${botId} to get transcript URL...`);
    const botResponse = await recallAPI.get(`/bot/${botId}/`);
    const bot = botResponse.data;
    const status = mapRecallStatus(bot.status_changes);

    // If bot is still in call, no transcript yet
    if (status === "joining" || status === "listening") {
      console.log(`Bot ${botId} still in call (${status}), no transcript yet`);
      return [];
    }

    // Step 2: Get the transcript download URL from recordings
    const recording = bot.recordings?.[0];
    if (!recording) {
      console.log(`No recordings found for bot ${botId}`);
      return [];
    }

    const transcriptArtifact = recording.media_shortcuts?.transcript;
    if (!transcriptArtifact) {
      console.log(`No transcript artifact in recording for bot ${botId}`);
      return [];
    }

    if (transcriptArtifact.status?.code !== "done") {
      console.log(`Transcript not ready yet: ${transcriptArtifact.status?.code}`);
      return [];
    }

    const downloadUrl = transcriptArtifact.data?.download_url;
    if (!downloadUrl) {
      console.log(`No download URL for transcript of bot ${botId}`);
      return [];
    }

    // Step 3: Download the transcript JSON
    console.log(`📥 Downloading transcript JSON...`);
    const transcriptResponse = await axios.get(downloadUrl);
    const rawTranscript = transcriptResponse.data;

    console.log(`📝 Downloaded transcript: type=${typeof rawTranscript}, isArray=${Array.isArray(rawTranscript)}`);

    // Step 4: Parse into our format
    // Recall.ai diarized format:
    // [{ speaker: "Sarthak", speaker_id: 0, words: [{ text: "Hello", start_timestamp: 0.5, end_timestamp: 1.0 }] }]
    let segments = Array.isArray(rawTranscript) ? rawTranscript : [];

    if (segments.length > 0) {
      console.log(`📝 Sample segment keys: ${Object.keys(segments[0]).join(", ")}`);
      console.log(`📝 Sample: ${JSON.stringify(segments[0]).substring(0, 200)}`);
    }

    const transcript = segments.map((segment) => {
      let text = "";
      let time = "0:00";

      if (Array.isArray(segment.words)) {
        text = segment.words.map((w) => (typeof w === "string" ? w : w.text || "")).join(" ");
        const firstWord = segment.words[0];
        if (firstWord && typeof firstWord === "object" && firstWord.start_timestamp != null) {
          time = formatTimestamp(firstWord.start_timestamp);
        }
      } else if (typeof segment.words === "string") {
        text = segment.words;
      } else if (segment.text) {
        text = segment.text;
      }

      return {
        speaker: segment.participant?.name || segment.speaker || segment.speaker_name || `Speaker ${segment.speaker_id || segment.participant?.id || 0}`,
        time,
        text: text.trim(),
      };
    }).filter((seg) => seg.text.length > 0);

    console.log(`✅ Processed ${transcript.length} transcript lines for bot ${botId}`);
    return transcript;
  } catch (error) {
    console.error(`❌ Transcript error:`, error.response?.status, error.response?.data || error.message);
    throw new Error(`Failed to get transcript: ${error.message}`);
  }
}

// ── Helpers ─────────────────────────────────────────────────

function mapRecallStatus(statusChanges) {
  if (!statusChanges || statusChanges.length === 0) return "joining";
  const latest = statusChanges[statusChanges.length - 1];
  const code = latest.code;

  const statusMap = {
    ready: "joining",
    joining_call: "joining",
    in_waiting_room: "joining",
    in_call_not_recording: "listening",
    in_call_recording: "listening",
    call_ended: "processing",
    recording_done: "processing",
    done: "done",
    fatal: "error",
    analysis_done: "done",
  };

  return statusMap[code] || code;
}

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getMockBot(meetLink) {
  return {
    id: "bot_mock_" + Date.now(),
    meetLink,
    status: "joining",
    createdAt: new Date().toISOString(),
    mock: true,
  };
}

function getMockTranscript() {
  return [
    { speaker: "Sarah", time: "0:02", text: "Alright, let's kick things off. Can everyone hear me okay?" },
    { speaker: "Mike", time: "0:05", text: "Yeah, audio is clear on my end." },
    { speaker: "Alex", time: "0:08", text: "Same here. I'll share my screen — got the roadmap doc open." },
    { speaker: "Sarah", time: "0:15", text: "Perfect. So the main goal today is to lock down priorities for Q2." },
    { speaker: "Mike", time: "0:25", text: "From engineering, the onboarding flow refactor is the highest ROI item." },
  ];
}

module.exports = { createBot, getBotStatus, stopBot, getTranscript, isConfigured };

import { auth } from "@/lib/firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/**
 * Get the current user's Firebase ID token for API authentication
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Make an authenticated API request
 */
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}


export const api = {
  health: () => fetchAPI("/health"),

  getSessions: () => fetchAPI("/sessions"),

  getSession: (id: string) => fetchAPI(`/sessions/${id}`),

  createSession: (data: {
    title: string;
    meetLink?: string;
    transcript?: Array<{ speaker: string; time: string; text: string }>;
    summary?: Record<string, unknown>;
    duration?: string;
    participants?: number;
  }) =>
    fetchAPI("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteSession: (id: string) =>
    fetchAPI(`/sessions/${id}`, { method: "DELETE" }),

  launchBot: (meetLink: string) =>
    fetchAPI("/bot/start", {
      method: "POST",
      body: JSON.stringify({ meetLink }),
    }),

  getBotStatus: (botId: string) => fetchAPI(`/bot/status/${botId}`),

  stopBot: (botId: string) =>
    fetchAPI(`/bot/stop/${botId}`, { method: "POST" }),

  getBotTranscript: (botId: string, autoSummarize = true) =>
    fetchAPI(`/bot/transcript/${botId}?summarize=${autoSummarize}`),

  summarize: (transcript: Array<{ speaker: string; time: string; text: string }>) =>
    fetchAPI("/summarize", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),

  ask: (question: string, topK = 5) =>
    fetchAPI("/ask", {
      method: "POST",
      body: JSON.stringify({ question, topK }),
    }),

  getAskHistory: () => fetchAPI("/ask/history"),

  deleteAskHistory: (id: string) =>
    fetchAPI(`/ask/history/${id}`, { method: "DELETE" }),
};

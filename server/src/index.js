// ─────────────────────────────────────────────────────────────
// MeetScribe Backend — Entry Point
// ─────────────────────────────────────────────────────────────
// This file does 3 things:
//   1. Loads environment variables from .env
//   2. Sets up Express with middleware (CORS, JSON parsing)
//   3. Mounts the API routes and starts listening
// ─────────────────────────────────────────────────────────────

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Import route files (we'll create these next)
const botRoutes = require("./routes/bot");
const sessionRoutes = require("./routes/sessions");
const summarizeRoutes = require("./routes/summarize");

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ───────────────────────────────────────────────
// cors()  → allows your Next.js frontend to call this backend
//           without being blocked by the browser's same-origin policy.
// express.json() → parses incoming JSON request bodies so
//                  req.body works in your route handlers.
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL, // Vercel URL, e.g. https://meet-bot.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Be permissive for now during development
    }
  },
  credentials: true,
}));
app.use(express.json());

// ── Health Check ────────────────────────────────────────────
// A simple route to verify the server is running.
// Try it: http://localhost:5000/api/health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "meetscribe-api",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ──────────────────────────────────────────────
// Each route file handles a group of related endpoints:
//   /api/bot/*       → deploy and manage the meeting bot
//   /api/sessions/*  → CRUD operations for meeting sessions
//   /api/summarize/* → send transcript to Gemini for summary
app.use("/api/bot", botRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/summarize", summarizeRoutes);

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ MeetScribe API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

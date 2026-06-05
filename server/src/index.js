require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Import route files (we'll create these next)
const botRoutes = require("./routes/bot");
const sessionRoutes = require("./routes/sessions");
const summarizeRoutes = require("./routes/summarize");

const app = express();
const PORT = process.env.PORT || 5001;

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

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "meetscribe-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/bot", botRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/summarize", summarizeRoutes);

app.listen(PORT, () => {
  console.log(`\n⚡ MeetScribe API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

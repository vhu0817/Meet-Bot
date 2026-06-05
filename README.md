# MeetScribe ⚡

An AI-powered meeting assistant that joins your Google Meet calls, transcribes everything, and spits out clean summaries with action items. Built this because I was tired of frantically taking notes during standups and losing track of who said what.

## What it does

- You paste a Google Meet link, a bot joins the call and records the conversation
- When the meeting's over (or you hit stop), it pulls the transcript from Recall.ai
- Transcript gets fed into Gemini which returns a structured summary — decisions made, action items with owners, overall sentiment, etc.
- Everything gets saved to Firestore so you can go back and look at past meetings

## Tech stack

**Frontend** — Next.js (App Router), React, TypeScript, CSS Modules  
**Backend** — Express, Node.js  
**Auth** — Firebase Auth (email/password + Google sign-in)  
**Database** — Cloud Firestore  
**AI** — Gemini 2.5 Flash via `@google/generative-ai`  
**Meeting bot** — Recall.ai (handles the actual Meet joining + audio capture)

## Getting started

### Prerequisites

You'll need API keys for:
- [Firebase](https://console.firebase.google.com) — create a project, enable Auth + Firestore
- [Gemini](https://aistudio.google.com) — grab an API key
- [Recall.ai](https://www.recall.ai) — sign up for bot access

### Setup

1. Clone the repo

```bash
git clone https://github.com/yourusername/Meet-Bot.git
cd Meet-Bot
```

2. Install dependencies for both client and server

```bash
cd client && npm install
cd ../server && npm install
```

3. Set up environment variables

```bash
# client
cp client/.env.example client/.env.local
# fill in your Firebase web config values

# server
cp server/.env.example server/.env
# fill in Gemini key, Recall key, Firebase service account path
```

4. Drop your Firebase service account JSON into `server/` (download from Firebase Console → Project Settings → Service Accounts)

5. Run both

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

Frontend runs on `localhost:3000`, API on `localhost:5000`.

## Project structure

```
Meet-Bot/
├── client/                 # Next.js frontend
│   └── src/
│       ├── app/            # pages — dashboard, login, signup, session detail, etc.
│       ├── context/        # React context for auth state
│       ├── lib/            # API client, Firebase init
│       └── types/          # TypeScript declarations
├── server/                 # Express backend
│   └── src/
│       ├── config/         # Firebase Admin setup
│       ├── middleware/     # JWT auth verification
│       ├── routes/         # bot, sessions, summarize endpoints
│       └── services/       # Gemini + Recall.ai integrations
```

## How the bot flow works

1. User hits "Launch Bot" → `POST /api/bot/start` → Recall.ai creates a bot and joins the Meet
2. Frontend polls `GET /api/bot/status/:id` every 5s to track bot state
3. User clicks "Stop & Get Summary" → `POST /api/bot/stop/:id` → bot leaves
4. Frontend fetches `GET /api/bot/transcript/:id?summarize=true` → server grabs the transcript from Recall, runs it through Gemini, returns both
5. Result gets saved as a session via `POST /api/sessions`

## Notes

- If you don't have Recall/Gemini keys set up, the app falls back to mock data so you can still poke around the UI
- Firestore needs a composite index on `sessions` (userId + createdAt) — the console will give you a direct link to create it when it first errors
- The CORS config is pretty permissive right now (allows all origins in dev). Tighten it up before deploying anywhere real
- Bot names show up as "MeetScribe Bot" in the Meet call — configurable in the settings page (or just change the default in `bot.js`)

## License

MIT

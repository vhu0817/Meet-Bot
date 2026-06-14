# MeetScribe ⚡

An AI-powered meeting assistant that joins your Google Meet calls, transcribes everything, and spits out clean summaries with action items. Built this because I was tired of frantically taking notes during standups and losing track of who said what.

## What it does

- You paste a Google Meet link, a bot joins the call and records the conversation
- When the meeting's over (or you hit stop), it pulls the transcript from Recall.ai
- Transcript gets fed into Gemini which returns a structured summary — decisions made, action items with owners, overall sentiment, etc.
- Everything gets saved to Firestore so you can go back and look at past meetings
- **Ask your meetings** — every transcript gets embedded into a vector store, so you can ask questions across all your past meetings ("what did we decide about the budget?") and get an answer with citations back to the exact meeting and moment
- There's also a separate **eval harness** (Python) for measuring summary quality and comparing prompt versions — see [`eval/`](./eval)

## Tech stack

**Frontend** — Next.js (App Router), React, TypeScript, CSS Modules  
**Backend** — Express, Node.js  
**Auth** — Firebase Auth (email/password + Google sign-in)  
**Database** — Cloud Firestore  
**AI** — Gemini 2.5 Flash via `@google/generative-ai`  
**RAG** — Gemini `gemini-embedding-001` embeddings (768-dim) + cosine similarity search over Firestore  
**Eval** — Python harness (ROUGE, BERTScore, action-item F1, LLM-as-judge)  
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
│       ├── app/            # pages — dashboard, login, signup, session detail, ask, etc.
│       ├── context/        # React context for auth state
│       ├── lib/            # API client, Firebase init
│       └── types/          # TypeScript declarations
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Firebase Admin setup
│   │   ├── middleware/     # JWT auth verification
│   │   ├── routes/         # bot, sessions, summarize, ask endpoints
│   │   └── services/       # Gemini, Recall.ai, embeddings, vector store, RAG
│   └── scripts/            # backfill-embeddings.js (index existing sessions)
└── eval/                   # Python eval harness (summary quality + prompt comparison)
```

## How the bot flow works

1. User hits "Launch Bot" → `POST /api/bot/start` → Recall.ai creates a bot and joins the Meet
2. Frontend polls `GET /api/bot/status/:id` every 5s to track bot state
3. User clicks "Stop & Get Summary" → `POST /api/bot/stop/:id` → bot leaves
4. Frontend fetches `GET /api/bot/transcript/:id?summarize=true` → server grabs the transcript from Recall, runs it through Gemini, returns both
5. Result gets saved as a session via `POST /api/sessions`

## How "Ask your meetings" works (RAG)

1. When a session is saved, its transcript is split into chunks, each embedded with Gemini's `gemini-embedding-001` (768-dim) and written to a `chunks` collection in Firestore — non-blocking, so a slow embed never holds up saving the meeting
2. You ask a question on the `/ask` page → `POST /api/ask`
3. The server embeds the question, scores it against every chunk you own with cosine similarity, and takes the top-k most relevant passages
4. Those passages go to Gemini as context with a strict "answer only from these, cite your sources" prompt
5. You get an answer back with source cards linking to the exact meeting + timestamp. Conversations are threaded and saved, so follow-ups keep context

Already have meetings saved from before this feature existed? Backfill them:

```bash
cd server && node scripts/backfill-embeddings.js
```

## Measuring summary quality (eval harness)

The `eval/` folder is a standalone Python project for checking how good the summaries actually are, and whether a new prompt beats the current one. It scores summaries on ROUGE, BERTScore, action-item F1 (vs hand-written references), and an LLM-as-judge rubric (faithfulness / completeness / hallucination). See [`eval/README.md`](./eval/README.md) for details.

```bash
cd eval && pip install -r requirements.txt && python run_eval.py
```

## Notes

- If you don't have Recall/Gemini keys set up, the app falls back to mock data so you can still poke around the UI (RAG uses deterministic mock vectors in that case, so retrieval runs but isn't semantically meaningful)
- Firestore needs a composite index on `sessions` (userId + createdAt) — and on `conversations` (userId + updatedAt) once you use the Ask page. The console gives you a direct link to create each one when it first errors; until then the code falls back to an unordered query + in-memory sort
- The CORS config is pretty permissive right now (allows all origins in dev). Tighten it up before deploying anywhere real
- Bot names show up as "MeetScribe Bot" in the Meet call — configurable in the settings page (or just change the default in `bot.js`)

## License

MIT

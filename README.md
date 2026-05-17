# ⚡ MeetScribe

An AI meeting assistant for Google Meet. You paste a meeting link, a bot joins the call, transcribes everything, and when the meeting ends you get a clean summary with action items — all powered by Gemini.

I built this because I kept forgetting what was said in meetings and taking notes manually was distracting me from actually participating. Now I just let the bot handle it.

## What it does

- **Bot joins your Google Meet** — just paste the link, the bot shows up in ~10 seconds
- **Live transcription** — speaker-aware, so you know who said what
- **AI summaries** — Gemini 2.5 Flash generates a summary with key decisions and action items
- **Session history** — all your past meetings are saved and searchable
- **Auth** — Firebase email/password auth, each user only sees their own sessions

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, CSS Modules, Framer Motion |
| Backend | Express.js, Node.js |
| Auth & DB | Firebase Auth + Firestore |
| Bot/Transcription | [Recall.ai](https://recall.ai) |
| AI Summarization | Google Gemini 2.5 Flash |

## Project structure

```
Meet-Bot/
├── client/                 # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # landing page
│       │   ├── login/              # login page
│       │   ├── signup/             # signup page
│       │   ├── dashboard/          # main dashboard — deploy bot, view sessions
│       │   ├── session/[id]/       # individual session — transcript + summary
│       │   ├── sessions/           # all sessions list
│       │   ├── starred/            # starred/bookmarked sessions
│       │   └── settings/           # user settings
│       ├── context/                # React context (auth state, etc.)
│       ├── lib/
│       │   ├── api.ts              # all API calls to the backend
│       │   └── firebase.ts         # Firebase client setup
│       └── types/                  # TypeScript types
│
└── server/                 # Express backend
    └── src/
        ├── index.js                # entry point, middleware, routes
        ├── config/
        │   └── firebase.js         # Firebase Admin init
        ├── middleware/              # auth middleware
        ├── routes/
        │   ├── bot.js              # POST /api/bot/deploy, stop, status
        │   ├── sessions.js         # CRUD for meeting sessions
        │   └── summarize.js        # POST /api/summarize
        └── services/
            ├── gemini.js           # Gemini API wrapper
            └── recall.js           # Recall.ai bot management
```

## Getting it running locally

### Prerequisites

- Node.js 18+ (I'm using v26 but 18 should work fine)
- npm
- A Firebase project (free tier is enough)
- A Recall.ai API key (they have a free tier for testing)
- A Gemini API key from [AI Studio](https://aistudio.google.com)

### 1. Clone it

```bash
git clone https://github.com/vhu0817/Meet-Bot.git
cd Meet-Bot
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in `/server`:

```env
PORT=5001
GEMINI_API_KEY=your_gemini_api_key
RECALL_API_KEY=your_recall_api_key
RECALL_REGION=us-west-2
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

For the Firebase Admin SDK, you need to download a service account JSON from your Firebase console:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the file as `firebase-service-account.json` in the `server/` folder

> **Heads up** — if you're on macOS, port 5000 is taken by AirPlay Receiver. That's why I set it to 5001. If you're on Linux you can use 5000 if you want, doesn't matter.

Start the server:

```bash
npm run dev
```

You should see something like:

```
✅ Firebase Admin initialized (from file)
✅ Recall.ai initialized
✅ Gemini AI initialized (gemini-2.5-flash)
⚡ MeetScribe API running on http://localhost:5001
```

### 3. Set up the frontend

```bash
cd ../client
npm install
```

Create a `.env.local` file in `/client`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

You can find all these Firebase values in Firebase Console → Project Settings → General → Your apps → Web app.

Start the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you should see the landing page.

### 4. Try it out

1. Sign up for an account
2. Go to the dashboard
3. Paste a Google Meet link and hit "Launch Bot"
4. The bot joins the meeting and starts transcribing
5. When you stop the bot or end the meeting, it generates a summary

## API endpoints

Quick reference for the backend routes:

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/bot/deploy` | Send bot to a meeting |
| GET | `/api/bot/:id/status` | Check bot status |
| POST | `/api/bot/:id/stop` | Pull bot out of meeting |
| GET | `/api/sessions` | Get all sessions for a user |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions/:id` | Get a specific session |
| PUT | `/api/sessions/:id` | Update a session |
| DELETE | `/api/sessions/:id` | Delete a session |
| POST | `/api/summarize` | Generate AI summary from transcript |

All endpoints (except health) require a Firebase auth token in the `Authorization: Bearer <token>` header.

## Things I'd like to add eventually

- [ ] Google Calendar integration so it auto-joins scheduled meetings
- [ ] Real-time transcript streaming to the frontend (websockets)
- [ ] Export to Notion/Google Docs
- [ ] Support for Zoom and Teams (Recall.ai supports them, just haven't wired it up)
- [ ] Better error handling on the frontend when the bot fails to join

## Known issues

- Sometimes the bot takes a few extra seconds to join if the Recall.ai region is far from you. I'm using `ap-northeast-1` since I'm in India but `us-west-2` is the default.
- If you close the browser while the bot is in a meeting, the bot stays in the call. You'd have to stop it from the dashboard when you come back.
- The mock transcript kicks in if you don't have a Recall.ai key set up — useful for testing the UI without burning API calls.

## License

MIT — do whatever you want with it.

// ─────────────────────────────────────────────────────────────
// Firebase Client Config
// ─────────────────────────────────────────────────────────────
// This file initializes Firebase in the BROWSER (client-side).
// It gives us access to:
//   - auth → for login/signup/logout
//   - db   → for reading/writing Firestore documents
//
// HOW TO SET UP:
//   1. Go to Firebase Console → Project Settings → Your apps
//   2. Copy your firebaseConfig values
//   3. Create a file: client/.env.local
//   4. Paste the values in this format:
//        NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
//        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=meetscribe-xxxxx.firebaseapp.com
//        NEXT_PUBLIC_FIREBASE_PROJECT_ID=meetscribe-xxxxx
//        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=meetscribe-xxxxx.appspot.com
//        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
//        NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
//
// WHY "NEXT_PUBLIC_" prefix?
//   Next.js only exposes env vars to the browser if they start
//   with NEXT_PUBLIC_. Without it, they're server-only.
// ─────────────────────────────────────────────────────────────

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (only once — getApps() prevents duplicates)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export the tools we need throughout the app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

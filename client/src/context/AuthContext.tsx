// ─────────────────────────────────────────────────────────────
// Auth Context
// ─────────────────────────────────────────────────────────────
// This wraps the entire app and provides:
//   - user        → the currently logged-in Firebase user (or null)
//   - loading     → true while Firebase checks if user is logged in
//   - loginEmail  → sign in with email + password
//   - signupEmail → create account with email + password
//   - loginGoogle → sign in with Google popup
//   - logout      → sign out
//
// HOW IT WORKS:
//   Firebase has a listener called onAuthStateChanged. It fires
//   whenever the user logs in or out. We listen to it and store
//   the user in React state. Every component that calls useAuth()
//   gets the current user automatically.
// ─────────────────────────────────────────────────────────────

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

// Define the shape of what this context provides
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  signupEmail: (name: string, email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes (runs once on mount)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    // Cleanup listener when component unmounts
    return () => unsubscribe();
  }, []);

  // Sign in with email + password
  async function loginEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // Create account with email + password
  async function signupEmail(name: string, email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Set the user's display name
    await updateProfile(credential.user, { displayName: name });
  }

  // Sign in with Google popup
  async function loginGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  // Sign out
  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginEmail, signupEmail, loginGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this in any component to access auth
// Usage: const { user, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

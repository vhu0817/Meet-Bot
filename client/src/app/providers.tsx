// ─────────────────────────────────────────────────────────────
// Providers Wrapper (Client Component)
// ─────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   layout.tsx is a Server Component (it must be, so the
//   `metadata` export works for SEO). But AuthProvider uses
//   React state and effects, which only work in Client Components.
//
//   Solution: Create this small "bridge" component that's marked
//   "use client", and wrap it around {children} in layout.tsx.
//   This way layout.tsx stays a Server Component, but everything
//   inside it has access to auth context.
// ─────────────────────────────────────────────────────────────

"use client";

import { AuthProvider } from "@/context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

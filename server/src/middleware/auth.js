// ─────────────────────────────────────────────────────────────
// Auth Middleware — Protects API Routes
// ─────────────────────────────────────────────────────────────
// HOW IT WORKS:
//   1. Frontend logs in via Firebase → gets a JWT token
//   2. Frontend sends that token in every API request:
//      fetch("/api/sessions", {
//        headers: { Authorization: "Bearer <token>" }
//      })
//   3. This middleware intercepts the request, extracts the token,
//      and asks Firebase Admin to verify it
//   4. If valid → attaches user info to req.user and continues
//   5. If invalid → returns 401 Unauthorized
//
// USAGE IN ROUTES:
//   const { requireAuth } = require("../middleware/auth");
//   router.get("/", requireAuth, async (req, res) => {
//     console.log(req.user.uid); // the verified user's Firebase UID
//   });
// ─────────────────────────────────────────────────────────────

const { admin } = require("../config/firebase");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email,
    };

    next(); // continue to the route handler
  } catch (error) {
    console.error("Auth verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };

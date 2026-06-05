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

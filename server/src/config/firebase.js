const admin = require("firebase-admin");
const path = require("path");

// Only initialize once
if (!admin.apps.length) {
  let serviceAccount = null;

  // Method 1: JSON string env var (for cloud deployments like Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log("✅ Firebase Admin initialized (from env JSON)");
    } catch (e) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
    }
  }

  // Method 2: JSON file path (for local development)
  if (!serviceAccount) {
    const defaultPath = path.join(__dirname, "..", "..", "firebase-service-account.json");
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountPath = envPath ? path.resolve(envPath) : defaultPath;

    try {
      serviceAccount = require(serviceAccountPath);
      console.log("✅ Firebase Admin initialized (from file)");
    } catch (error) {
      console.warn(
        "⚠️  Firebase Admin not initialized — service account not found"
      );
      console.warn("   Set FIREBASE_SERVICE_ACCOUNT_JSON env var (cloud) or");
      console.warn("   save firebase-service-account.json in server/ (local)\n");
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

// Firestore database reference
const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };

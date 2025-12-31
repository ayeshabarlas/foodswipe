const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if service account is provided via path or environment variables
// For this setup, we'll assume the user might provide the path to the JSON file
// or we can parse the JSON content from an env var if they prefer.

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

console.log('🔥 Firebase Admin SDK Initialization Check');

if (serviceAccountJson) {
    try {
        let serviceAccount;
        if (serviceAccountJson.trim().startsWith('{')) {
            serviceAccount = JSON.parse(serviceAccountJson);
        } else {
            // If it's not a JSON string, assume it's a file path (for local dev)
            const resolvedPath = path.resolve(__dirname, '..', serviceAccountJson);
            if (fs.existsSync(resolvedPath)) {
                serviceAccount = require(resolvedPath);
            }
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
        }
    } catch (error) {
        console.error("❌ Firebase Initialization Error:", error.message);
        console.warn("Server will start without Firebase authentication.");
    }
} else {
    console.warn("⚠️  Firebase Admin SDK not initialized. FIREBASE_SERVICE_ACCOUNT_JSON missing.");
}

module.exports = admin;

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if service account is provided via path or environment variables
// For this setup, we'll assume the user might provide the path to the JSON file
// or we can parse the JSON content from an env var if they prefer.

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

console.log('🔥 Firebase Admin SDK Initialization:');
console.log('  FIREBASE_SERVICE_ACCOUNT_PATH:', serviceAccountPath);

if (serviceAccountJson) {
    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin SDK initialized from JSON env');
    } catch (error) {
        console.error("❌ Error parsing Firebase service account JSON env:");
        console.error("  Error message:", error.message);
        console.error("  Error stack:", error.stack);
        console.warn("Server will start without Firebase authentication.");
    }
} else if (serviceAccountPath) {
    try {
        // Resolve the path relative to the backend directory
        const resolvedPath = path.resolve(__dirname, '..', serviceAccountPath);
        console.log('  Resolved path:', resolvedPath);
        console.log('  File exists:', fs.existsSync(resolvedPath));

        // Check if file exists before requiring it
        if (fs.existsSync(resolvedPath)) {
            const serviceAccount = require(resolvedPath);
            console.log('  Service Account project_id:', serviceAccount.project_id);
            console.log('  Service Account client_email:', serviceAccount.client_email);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
        } else {
            console.warn(`❌ Firebase service account file not found at: ${resolvedPath}`);
            console.warn("Firebase Admin SDK not initialized. Server will start without Firebase authentication.");
        }
    } catch (error) {
        console.error("❌ Error initializing Firebase Admin SDK:");
        console.error("  Error message:", error.message);
        console.error("  Error stack:", error.stack);
        console.warn("Server will start without Firebase authentication.");
    }
} else {
    // Fallback or alternative initialization if needed
    // For now, we'll just log a warning if not initialized, but we shouldn't crash 
    // immediately to allow the server to start even if auth isn't fully configured yet.
    console.warn("⚠️  Firebase Admin SDK not initialized. Provide FIREBASE_SERVICE_ACCOUNT_PATH in .env");
}

module.exports = admin;

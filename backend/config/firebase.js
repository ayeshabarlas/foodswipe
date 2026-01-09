const admin = require('firebase-admin');

if (!admin.apps.length) {
    console.log('🔥 Firebase Admin SDK Initialization Check');
    try {
        const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        
        if (serviceAccountVar) {
            let serviceAccount;
            try {
                // Try to parse if it's a stringified JSON
                serviceAccount = typeof serviceAccountVar === 'string' ? JSON.parse(serviceAccountVar) : serviceAccountVar;
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('✅ Firebase Admin SDK initialized successfully');
            } catch (parseErr) {
                console.error('❌ Firebase Service Account Parse Error:', parseErr.message);
                console.warn('⚠️ Firebase initialized without credentials (limited functionality)');
                admin.initializeApp();
            }
        } else {
            console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON is missing. Using default initialization.');
            admin.initializeApp();
        }
    } catch (error) {
        console.error('❌ Firebase Initialization Critical Error:', error.message);
    }
}

module.exports = admin;

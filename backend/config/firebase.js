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
                
                const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 
                                  (serviceAccount.project_id ? `${serviceAccount.project_id}.firebasestorage.app` : null) ||
                                  (serviceAccount.project_id ? `${serviceAccount.project_id}.appspot.com` : null);
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: bucketName
                });
                console.log(`✅ Firebase Admin SDK initialized successfully with bucket: ${bucketName}`);
            } catch (parseErr) {
                console.error('❌ Firebase Service Account Parse Error:', parseErr.message);
                console.warn('⚠️ Firebase initialized without credentials (limited functionality)');
                const fallbackBucket = process.env.FIREBASE_STORAGE_BUCKET || 'foodswipe-be395.firebasestorage.app';
                admin.initializeApp({
                    storageBucket: fallbackBucket
                });
                console.log(`⚠️ Initialized with fallback bucket: ${fallbackBucket}`);
            }
        } else {
            console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON is missing. Using default initialization.');
            const fallbackBucket = process.env.FIREBASE_STORAGE_BUCKET || 'foodswipe-be395.firebasestorage.app';
            admin.initializeApp({
                storageBucket: fallbackBucket
            });
            console.log(`⚠️ Initialized with fallback bucket: ${fallbackBucket}`);
        }
    } catch (error) {
        console.error('❌ Firebase Initialization Critical Error:', error.message);
    }
}

const storage = admin.storage();
const bucket = storage.bucket();

module.exports = { admin, bucket };

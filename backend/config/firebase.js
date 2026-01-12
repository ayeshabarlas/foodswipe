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
                
                // Improved bucket name derivation
                let bucketName = process.env.FIREBASE_STORAGE_BUCKET;
                
                if (!bucketName && serviceAccount.project_id) {
                    // Try to determine if it's a newer or older project
                    // Newer ones use .firebasestorage.app, older ones use .appspot.com
                    // We'll log the project_id to help troubleshooting
                    console.log(`ℹ️ Project ID from service account: ${serviceAccount.project_id}`);
                    
                    // Since the user reported 404 with .appspot.com, let's try .firebasestorage.app
                    // or just leave it undefined and let Firebase Admin try to find it
                    bucketName = `${serviceAccount.project_id}.firebasestorage.app`;
                    console.log(`ℹ️ Trying bucket name: ${bucketName}`);
                }
                
                const options = {
                    credential: admin.credential.cert(serviceAccount)
                };
                
                if (bucketName) {
                    options.storageBucket = bucketName;
                }
                
                admin.initializeApp(options);
                console.log(`✅ Firebase Admin SDK initialized successfully`);
            } catch (parseErr) {
                console.error('❌ Firebase Service Account Parse Error:', parseErr.message);
                console.warn('⚠️ Firebase initialized without credentials (limited functionality)');
                // Fallback
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

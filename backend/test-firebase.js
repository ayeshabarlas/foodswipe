// Test Firebase Admin SDK
require('dotenv').config();
const admin = require('./config/firebase');

console.log('\n=== Firebase Admin SDK Test ===\n');

try {
    const app = admin.app();
    console.log('✅ Firebase app exists');
    console.log('   App name:', app.name);

    // Check if we can access auth
    const auth = admin.auth();
    console.log('✅ Firebase Auth accessible');

    // Try to get project ID from credentials
    if (app.options && app.options.credential) {
        console.log('✅ Credentials loaded');
        console.log('   Project ID:', app.options.credential.projectId || 'N/A');
    }

    console.log('\n✅ Firebase Admin SDK is working!\n');
    process.exit(0);
} catch (error) {
    console.error('\n❌ Firebase Admin SDK Error:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('\nFull error:', error);
    process.exit(1);
}

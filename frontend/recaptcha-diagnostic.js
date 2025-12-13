/**
 * Firebase reCAPTCHA Diagnostic Script
 * Run this in the browser console to check if reCAPTCHA can load
 */

console.log('=== Firebase reCAPTCHA Diagnostics ===');

// 1. Check if Firebase is loaded
console.log('\n1. Firebase Status:');
try {
    const firebase = require('firebase/app');
    console.log('✅ Firebase loaded');
} catch (e) {
    console.log('❌ Firebase not loaded:', e);
}

// 2. Check if reCAPTCHA container exists
console.log('\n2. reCAPTCHA Container:');
const container = document.getElementById('recaptcha-container');
if (container) {
    console.log('✅ Container found:', container);
} else {
    console.log('❌ Container NOT found - make sure modal is open');
}

// 3. Check Firebase config
console.log('\n3. Firebase Config:');
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Not set');
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set');

// 4. Test reCAPTCHA loading
console.log('\n4. Testing reCAPTCHA Load:');
console.log('Try loading: https://www.google.com/recaptcha/api.js');
fetch('https://www.google.com/recaptcha/api.js')
    .then(() => console.log('✅ reCAPTCHA script accessible'))
    .catch(e => console.log('❌ Cannot reach reCAPTCHA:', e));

// 5. Check for common issues
console.log('\n5. Common Issues:');
console.log('- Is localhost in Firebase Console > Authentication > Settings > Authorized domains?');
console.log('- Is Phone Auth enabled in Firebase Console > Authentication > Sign-in methods?');
console.log('- Are you using an ad blocker or privacy extension that blocks Google services?');
console.log('- Is your network/firewall blocking recaptcha.net or google.com?');

console.log('\n=== End Diagnostics ===');

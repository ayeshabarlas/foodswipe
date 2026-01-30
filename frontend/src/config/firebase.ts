import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBBwurPdZPLvTupX_YGiHYZRG3-ct3NWKU",
    authDomain: "foodswipe-be395.firebaseapp.com", // Ensure this matches exactly with Firebase Console -> Settings -> Authorized Domains
    projectId: "foodswipe-be395",
    storageBucket: "foodswipe-be395.firebasestorage.app",
    messagingSenderId: "975401301298",
    appId: "1:975401301298:web:06815eeda893dc48e8132b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with App Check bypass for development
export const auth = getAuth(app);

// CRITICAL FIX: Only enable test mode in localhost development
if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.');
                        
    if (isLocalhost) {
        (auth as any).settings = (auth as any).settings || {};
        (auth as any).settings.appVerificationDisabledForTesting = true;
        console.log('🔧 Firebase Auth: Test mode enabled for localhost');
    }
}

// Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

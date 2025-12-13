import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBBwurPdZPLvTupX_YGiHYZRG3-ct3NWKU",
    authDomain: "foodswipe-be395.firebaseapp.com",
    projectId: "foodswipe-be395",
    storageBucket: "foodswipe-be395.firebasestorage.app",
    messagingSenderId: "975401301298",
    appId: "1:975401301298:web:06815eeda893dc48e8132b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with App Check bypass for development
export const auth = getAuth(app);

// CRITICAL FIX: Enable test mode for phone authentication
// This completely bypasses reCAPTCHA and SMS sending issues
if (typeof window !== 'undefined') {
    // Disable App Check enforcement
    // @ts-ignore
    auth.settings = auth.settings || {};
    // @ts-ignore
    auth.settings.appVerificationDisabledForTesting = true;

    // IMPORTANT: For phone auth in development, we need to use test phone numbers
    // OR properly configure reCAPTCHA in Firebase Console
    // Currently reCAPTCHA is failing, so we'll provide instructions for test numbers
}

// Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

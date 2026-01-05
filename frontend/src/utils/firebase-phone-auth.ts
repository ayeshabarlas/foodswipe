import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../config/firebase';

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize reCAPTCHA verifier (VISIBLE for reliability)
 * Call this once when component mounts
 */
export const initRecaptcha = (containerId: string = 'recaptcha-container'): RecaptchaVerifier => {
    // Check if container element exists
    const container = document.getElementById(containerId);
    if (!container) {
        const error = `reCAPTCHA container element with id "${containerId}" not found`;
        console.error(error);
        throw new Error(error);
    }

    // Clean up existing verifier
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch (e) {
            console.log('Error clearing existing verifier:', e);
        }
        recaptchaVerifier = null;
    }

    try {
        console.log(`Initializing visible reCAPTCHA on element: ${containerId}`);

        // Use VISIBLE reCAPTCHA for reliability
        recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
            size: 'normal',
            callback: () => {
                console.log('✅ reCAPTCHA solved successfully');
            },
            'expired-callback': () => {
                console.warn('⚠️ reCAPTCHA expired, please try again');
            },
            'error-callback': (error: any) => {
                console.error('❌ reCAPTCHA error:', error);
            }
        });

        // Render the reCAPTCHA immediately
        console.log('📱 Rendering reCAPTCHA verifier...');
        recaptchaVerifier.render().then((widgetId) => {
            console.log('✅ reCAPTCHA rendered, widget ID:', widgetId);
        }).catch((err) => {
            console.error('❌ reCAPTCHA render error:', err);
        });

        console.log('✅ reCAPTCHA verifier created successfully');
        return recaptchaVerifier;
    } catch (error) {
        console.error('❌ Failed to create reCAPTCHA verifier:', error);
        throw error;
    }
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number with country code (e.g., +923001234567)
 * @returns ConfirmationResult for OTP verification
 */
export const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
        if (!recaptchaVerifier) {
            throw new Error('reCAPTCHA not initialized. Call initRecaptcha() first.');
        }

        console.log('📱 Sending OTP to:', phoneNumber);

        // Send OTP
        console.log('📤 Calling signInWithPhoneNumber...');
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        console.log('✅ OTP sent successfully');
        return confirmationResult;
    } catch (error: any) {
        console.error('Error sending OTP:', error);

        // Reset recaptcha on error so user can try again
        if (recaptchaVerifier) {
            try {
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            } catch (e) {
                console.log('Error clearing verifier:', e);
            }
        }

        throw error;
    }
};

/**
 * Verify OTP code
 * @param confirmationResult - Result from sendOTP
 * @param code - 6-digit OTP code
 * @returns UserCredential if successful
 */
export const verifyOTP = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
        const result = await confirmationResult.confirm(code);
        console.log('OTP verified successfully');
        return result;
    } catch (error: any) {
        console.error('Error verifying OTP:', error);
        throw error;
    }
};

/**
 * Clean up recaptcha verifier
 */
export const cleanupRecaptcha = () => {
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        } catch (e) {
            console.log('Error during cleanup:', e);
        }
        recaptchaVerifier = null;
    }
};

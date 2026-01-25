const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, sendOtp, verifyOtp, verifyPhone, verifyFirebaseToken, updateProfile, checkPhoneExists, socialLogin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/social-login', socialLogin);
router.get('/me', protect, getMe);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/verify-phone', protect, verifyPhone);
router.post('/verify-firebase-token', verifyFirebaseToken);
router.put('/profile', protect, updateProfile);
router.post('/check-phone', checkPhoneExists);

module.exports = router;

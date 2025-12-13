try {
    console.log('Loading Otp model...');
    require('./models/Otp');
    console.log('Otp model loaded.');

    console.log('Loading User model...');
    require('./models/User');
    console.log('User model loaded.');

    console.log('Loading authController...');
    require('./controllers/authController');
    console.log('authController loaded.');

    console.log('Backend integrity check passed.');
} catch (error) {
    console.error('Backend integrity check failed:', error);
    process.exit(1);
}

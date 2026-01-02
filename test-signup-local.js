const axios = require('axios');

const testSignup = async () => {
    try {
        const res = await axios.post('http://localhost:8080/api/auth/register', {
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'password123',
            role: 'customer'
        });
        console.log('✅ Local Signup Success:', res.data);
    } catch (err) {
        console.error('❌ Local Signup Failed:', err.response?.data || err.message);
    }
};

testSignup();

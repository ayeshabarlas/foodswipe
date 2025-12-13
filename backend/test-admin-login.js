// Test admin login endpoint
const axios = require('axios');

const testAdminLogin = async () => {
    try {
        console.log('🧪 Testing admin login endpoint...\n');

        const loginData = {
            identifier: 'ayeshabarlas92@gmail.com',
            password: 'admin123',
            role: 'admin'
        };

        console.log('📤 Sending login request:');
        console.log(JSON.stringify(loginData, null, 2));
        console.log('');

        const response = await axios.post('http://localhost:5000/api/auth/login', loginData);

        console.log('✅ Login successful!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Login failed!');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
};

testAdminLogin();

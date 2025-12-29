const axios = require('axios');

async function testRegistration() {
    try {
        console.log('Testing admin registration endpoint...');
        const response = await axios.post('http://localhost:5000/api/admin/register', {
            name: 'Test Admin',
            email: 'test@test.com',
            password: 'test123'
        });
        console.log('✅ Registration successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Registration failed!');
        console.error('Error:', error.response?.data || error.message);
    }
}

testRegistration();

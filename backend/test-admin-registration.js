const axios = require('axios');

async function testRegistration() {
    try {
        console.log('Testing registration endpoint...');
        const response = await axios.post('http://localhost:5000/api/admin/register', {
            name: 'Ayesha',
            email: 'ayeshabarlas636@gmail.com',
            password: 'password123'
        });
        console.log('✅ Registration successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Registration failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRegistration();

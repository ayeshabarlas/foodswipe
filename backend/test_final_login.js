const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5000/api/admin/login', {
            identifier: 'ayeshabarlas92@gmail.com',
            password: 'Password123'
        });
        console.log('Login Success!');
        console.log('Data:', response.data);
    } catch (error) {
        console.error('Login Failed!');
        console.error('Error:', error.response?.data || error.message);
    }
}

testLogin();

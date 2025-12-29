const axios = require('axios');

const testAdminLogin = async () => {
    try {
        console.log('Testing Admin Login...');
        const response = await axios.post('http://localhost:5000/api/admin/login', {
            identifier: 'ayeshabarlas92@gmail.com',
            password: '123456'
        });
        console.log('✅ Login Success:', response.data);
    } catch (error) {
        console.error('❌ Login Failed:', error.response?.status, error.response?.data);
    }
};

testAdminLogin();

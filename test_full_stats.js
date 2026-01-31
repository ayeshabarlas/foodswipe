
const axios = require('axios');

async function testAdminStats() {
    const API_URL = 'http://localhost:5000';
    const LOGIN_EMAIL = 'superadmin@foodswipe.com';
    const LOGIN_PASS = 'FoodSwipe@DEBUG@2024';

    try {
        console.log('Logging in to:', `${API_URL}/api/admin/login`);
        const loginRes = await axios.post(`${API_URL}/api/admin/login`, {
            email: LOGIN_EMAIL,
            password: LOGIN_PASS
        });

        const token = loginRes.data.token;
        console.log('Login successful, token received.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('Fetching Quick Stats...');
        const quickRes = await axios.get(`${API_URL}/api/admin/stats/quick`, config);
        console.log('Quick Stats:', JSON.stringify(quickRes.data, null, 2));

        console.log('Fetching Finance Stats...');
        const financeRes = await axios.get(`${API_URL}/api/admin/stats/finance`, config);
        console.log('Finance Stats:', JSON.stringify(financeRes.data, null, 2));

        console.log('Fetching Full Stats...');
        const fullRes = await axios.get(`${API_URL}/api/admin/stats`, config);
        console.log('Full Stats keys:', Object.keys(fullRes.data));

    } catch (err) {
        console.error('Test failed:', err.response?.data || err.message);
    }
}

testAdminStats();

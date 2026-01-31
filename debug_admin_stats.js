
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

async function testAdminStats() {
    const API_URL = 'https://foodswipe-6178.onrender.com/api'; 
    const email = 'superadmin@foodswipe.com';
    const password = 'FoodSwipe@DEBUG@2024';

    try {
        console.log('--- TESTING ADMIN STATS ---');
        console.log('API URL:', API_URL);

        // 1. Login
        console.log('Attempting login...');
        const loginRes = await axios.post(`${API_URL}/admin/login`, {
            identifier: email,
            password: password
        });

        const token = loginRes.data.token;
        console.log('Login successful! Token received.');

        const config = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };

        // 2. Test Quick Stats
        console.log('\nFetching Quick Stats...');
        try {
            const quickRes = await axios.get(`${API_URL}/admin/stats/quick`, { ...config, timeout: 30000 });
            console.log('Quick Stats:', JSON.stringify(quickRes.data, null, 2));
        } catch (err) {
            console.error('Quick Stats Failed:', err.response?.data || err.message);
        }

        // 3. Test Finance Stats
        console.log('\nFetching Finance Stats...');
        try {
            const financeRes = await axios.get(`${API_URL}/admin/stats/finance`, config);
            console.log('Finance Stats:', JSON.stringify(financeRes.data, null, 2));
        } catch (err) {
            console.error('Finance Stats Failed:', err.response?.data || err.message);
        }

        // 4. Test Full Stats
        console.log('\nFetching Full Stats (Dashboard)...');
        try {
            const fullRes = await axios.get(`${API_URL}/admin/stats`, config);
            console.log('Full Stats:', JSON.stringify(fullRes.data, null, 2));
        } catch (err) {
            console.error('Full Stats Failed:', err.response?.data || err.message);
        }

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testAdminStats();

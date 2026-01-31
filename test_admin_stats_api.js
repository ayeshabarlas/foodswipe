const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'superadmin@foodswipe.com';
const ADMIN_PASSWORD = 'FoodSwipe@DEBUG@2024';

async function testStats() {
    console.log('--- ADMIN API TEST ---');
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        const token = loginRes.data.token;
        console.log('✅ Login successful. Token obtained.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Test Quick Stats
        console.log('\nFetching Quick Stats...');
        const startQuick = Date.now();
        const quickRes = await axios.get(`${BASE_URL}/api/admin/stats/quick`, config);
        console.log(`✅ Quick Stats (took ${Date.now() - startQuick}ms):`, quickRes.data);

        // 3. Test Full Stats
        console.log('\nFetching Full Dashboard Stats...');
        const startFull = Date.now();
        const fullRes = await axios.get(`${BASE_URL}/api/admin/stats`, config);
        console.log(`✅ Full Stats (took ${Date.now() - startFull}ms):`);
        // Don't log everything, just counts
        const s = fullRes.data;
        console.log({
            totalUsers: s.totalUsers,
            totalRestaurants: s.totalRestaurants,
            totalOrders: s.totalOrders,
            totalRiders: s.totalRiders,
            totalRevenue: s.totalRevenue
        });

        // 4. Test Finance Stats
        console.log('\nFetching Finance Stats...');
        const startFinance = Date.now();
        const financeRes = await axios.get(`${BASE_URL}/api/admin/stats/finance`, config);
        console.log(`✅ Finance Stats (took ${Date.now() - startFinance}ms):`, financeRes.data);

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testStats();

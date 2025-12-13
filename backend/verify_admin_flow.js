const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const verifyAdminFlow = async () => {
    try {
        // 1. Login as Admin
        console.log('Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Admin logged in successfully.');

        // 2. Get Pending Restaurants
        console.log('Fetching pending restaurants...');
        const pendingRes = await axios.get(`${API_URL}/admin/restaurants/pending`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const pendingRestaurants = pendingRes.data;
        console.log(`Found ${pendingRestaurants.length} pending restaurants.`);

        if (pendingRestaurants.length === 0) {
            console.log('No pending restaurants found to approve.');
            return;
        }

        const restaurantId = pendingRestaurants[0]._id;
        console.log(`Approving restaurant ID: ${restaurantId}`);

        // 3. Approve Restaurant
        const approveRes = await axios.put(`${API_URL}/admin/restaurants/${restaurantId}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Approval response:', approveRes.data.message);

        // 4. Verify Status
        if (approveRes.data.restaurant.isVerified && approveRes.data.restaurant.verificationStatus === 'approved') {
            console.log('SUCCESS: Restaurant verified successfully!');
        } else {
            console.error('FAILURE: Restaurant verification status mismatch.');
        }

    } catch (error) {
        console.error('Error in verification flow:', error.response ? error.response.data : error.message);
    }
};

verifyAdminFlow();

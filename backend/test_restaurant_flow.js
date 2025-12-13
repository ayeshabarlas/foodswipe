const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testRestaurantFlow = async () => {
    try {
        console.log('=== Testing Restaurant Flow ===\n');

        // Step 1: Register a new user
        console.log('1. Registering new user...');
        const registerData = {
            name: 'Test Restaurant Owner',
            email: `test${Date.now()}@example.com`,
            password: 'password123',
            phone: '0300-1234567',
            role: 'customer' // Start as customer
        };

        const registerRes = await axios.post(`${API_URL}/auth/register`, registerData);
        const token = registerRes.data.token;
        const userId = registerRes.data._id;
        console.log(`✓ User registered: ${registerRes.data.email}`);
        console.log(`  Role: ${registerRes.data.role}`);
        console.log(`  Token: ${token.substring(0, 20)}...`);
        console.log(`  User ID: ${userId}\n`);

        // Step 2: Create restaurant profile
        console.log('2. Creating restaurant profile...');
        const restaurantData = {
            name: `Test Restaurant ${Date.now()}`,
            address: '123 Test Street, Lahore',
            contact: '0300-1234567',
            description: 'A test restaurant'
        };

        const createRes = await axios.post(`${API_URL}/restaurants`, restaurantData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✓ Restaurant created: ${createRes.data.name}`);
        console.log(`  Restaurant ID: ${createRes.data._id}`);
        console.log(`  Owner: ${createRes.data.owner}\n`);

        // Step 3: Verify user role was updated
        console.log('3. Checking user role update...');
        const meRes = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✓ Current user role: ${meRes.data.role}`);
        if (meRes.data.role !== 'restaurant') {
            console.error('✗ ERROR: Role not updated to "restaurant"!');
        }
        console.log('');

        // Step 4: Fetch restaurant
        console.log('4. Fetching restaurant via /my-restaurant...');
        const myRestaurantRes = await axios.get(`${API_URL}/restaurants/my-restaurant`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✓ Restaurant fetched: ${myRestaurantRes.data.name}`);
        console.log(`  Verification Status: ${myRestaurantRes.data.verificationStatus}\n`);

        console.log('=== ALL TESTS PASSED ===');

    } catch (error) {
        console.error('\n=== TEST FAILED ===');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${error.response.data.message || error.response.data}`);
            console.error(`URL: ${error.config.url}`);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
};

testRestaurantFlow();

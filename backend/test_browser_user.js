const axios = require('axios');

// Test with the user that was just created in the browser
const testWithBrowserUser = async () => {
    try {
        console.log('=== Testing with Browser-Created User ===\n');

        // Login as the user created in browser
        console.log('1. Logging in as finaltest@example.com...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'finaltest@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log(`✓ Login successful`);
        console.log(`  Token: ${token.substring(0, 20)}...`);
        console.log(`  Role: ${loginRes.data.role}\n`);

        // Try to create restaurant
        console.log('2. Creating restaurant...');
        const restaurantData = {
            name: 'Final Test Restaurant',
            address: '456 Success Street',
            contact: '0300-8888888',
            description: 'Testing the fix'
        };

        const createRes = await axios.post('http://localhost:5000/api/restaurants', restaurantData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✓ Restaurant created successfully!`);
        console.log(`  Name: ${createRes.data.name}`);
        console.log(`  ID: ${createRes.data._id}\n`);

        // Fetch the restaurant
        console.log('3. Fetching restaurant...');
        const fetchRes = await axios.get('http://localhost:5000/api/restaurants/my-restaurant', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✓ Restaurant fetched!`);
        console.log(`  Name: ${fetchRes.data.name}`);
        console.log(`  Verification Status: ${fetchRes.data.verificationStatus}\n`);

        console.log('=== SUCCESS! Everything is working! ===');

    } catch (error) {
        console.error('\n=== ERROR ===');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${error.response.data.message || JSON.stringify(error.response.data)}`);
        } else {
            console.error(error.message);
        }
    }
};

testWithBrowserUser();

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testOrder = async () => {
    try {
        // 1. Register/Login a user to get a token
        console.log('1. Authenticating...');
        let token;
        let user;

        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'test@example.com',
                password: 'password123'
            });
            token = loginRes.data.token;
            user = loginRes.data;
            console.log('   Login successful.');
        } catch (e) {
            console.log('   Login failed, trying register...');
            const registerRes = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                phone: '1234567890'
            });
            token = registerRes.data.token;
            user = registerRes.data;
            console.log('   Registration successful.');
        }

        console.log('   Token:', token ? 'Received' : 'Missing');

        // 2. Create an Order
        console.log('\n2. Creating Order...');
        const orderData = {
            restaurant: "6921ad61418a3cb440f6a832", // Mock ID, might need a real one
            items: [
                {
                    dish: "6921ad61418a3cb440f6a83d",
                    name: "Test Dish",
                    quantity: 1,
                    price: 500,
                    image: "https://via.placeholder.com/150"
                }
            ],
            deliveryAddress: "Test Address",
            totalAmount: 550,
            paymentMethod: "card",
            deliveryInstructions: "Leave at door"
        };

        // Need a valid restaurant ID. Let's fetch one first.
        try {
            const restRes = await axios.get(`${API_URL}/restaurants`);
            if (restRes.data.length > 0) {
                orderData.restaurant = restRes.data[0]._id;
                console.log('   Using Restaurant ID:', orderData.restaurant);
            } else {
                console.log('   No restaurants found. Using mock ID.');
            }
        } catch (e) {
            console.log('   Failed to fetch restaurants:', e.message);
        }

        const orderRes = await axios.post(`${API_URL}/orders`, orderData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('   Order Created Successfully!');
        console.log('   Order ID:', orderRes.data._id);

    } catch (error) {
        console.error('\nTEST FAILED:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testOrder();

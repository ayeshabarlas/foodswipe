const axios = require('axios');

async function testFlow() {
    try {
        console.log('1. Logging in as restaurant owner (ayeshabarlas16@gmail.com)...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            identifier: 'ayeshabarlas16@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        console.log('2. Creating Restaurant...');
        const createPayload = {
            name: "Test Resto " + Date.now(),
            address: "123 Test St",
            contact: "+923001234567",
            description: "Test description",
            businessType: "restaurant",
            ownerCNIC: "123232323",
            // Mocking other fields
        };

        try {
            await axios.post('http://localhost:5000/api/restaurants/create', createPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Restaurant created successfully.');
        } catch (e) {
            console.log('Creation failed (maybe already exists):', e.response?.data?.message || e.message);
        }

        console.log('3. Fetching My Restaurant...');
        const myRestoRes = await axios.get('http://localhost:5000/api/restaurants/my-restaurant', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('My Restaurant fetched:', myRestoRes.data.name);

    } catch (error) {
        console.error('Flow failed:', error.response?.data || error.message);
    }
}

testFlow();

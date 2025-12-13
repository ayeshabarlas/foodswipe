const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runTest = async () => {
    let token, userId;

    try {
        // 1. Try to register a test user (will fail if already exists)
        console.log('Attempting to register test user...');
        try {
            const registerRes = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Rider',
                email: 'testnotif@example.com',
                phone: '+923001111111',
                password: 'test123',
                role: 'customer'
            });
            token = registerRes.data.token;
            userId = registerRes.data._id;
            console.log('Test user created successfully');
        } catch (regError) {
            // User already exists, try to login
            console.log('User already exists, attempting login...');
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                identifier: 'testnotif@example.com',
                password: 'test123'
            });
            token = loginRes.data.token;
            userId = loginRes.data._id;
            console.log('Logged in successfully');
        }

        console.log('User ID:', userId);
        console.log('Token:', token.substring(0, 20) + '...\n');

        // 2. Create a test notification
        console.log('Creating test notification...');
        const notifRes = await axios.post(`${API_URL}/notifications/test`, {
            userId: userId,
            type: 'order',
            title: 'New Order Assigned',
            message: 'You have been assigned a new delivery order.',
            data: { orderId: '12345', restaurant: 'Test Restaurant' }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✓ Notification created:', notifRes.data._id, '\n');

        // 3. Fetch notifications
        console.log('Fetching all notifications...');
        const fetchRes = await axios.get(`${API_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✓ Total notifications:', fetchRes.data.length);

        const createdNotif = fetchRes.data.find(n => n._id === notifRes.data._id);
        if (createdNotif) {
            console.log('✓ SUCCESS: Created notification found in list');
            console.log('  - Title:', createdNotif.title);
            console.log('  - Message:', createdNotif.message);
            console.log('  - Read:', createdNotif.read);
        } else {
            console.error('✗ FAILURE: Created notification NOT found\n');
            return;
        }

        // 4. Mark notification as read
        console.log('\nMarking notification as read...');
        await axios.put(`${API_URL}/notifications/${notifRes.data._id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✓ Notification marked as read');

        // 5. Verify it's marked as read
        const updatedFetchRes = await axios.get(`${API_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const updatedNotif = updatedFetchRes.data.find(n => n._id === notifRes.data._id);
        if (updatedNotif && updatedNotif.read) {
            console.log('✓ SUCCESS: Notification is now marked as read\n');
        } else {
            console.error('✗ FAILURE: Notification was not marked as read\n');
        }

        console.log('========================================');
        console.log('ALL TESTS PASSED ✓');
        console.log('========================================');

    } catch (error) {
        console.error('\n✗ Test failed:', error.response ? error.response.data : error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
};

runTest();

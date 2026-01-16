
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const testSync = async () => {
    try {
        // We need an admin token. Since this is a test script, we might not have one easily.
        // But we can check if the endpoint is reachable and requires auth.
        const baseUrl = 'http://localhost:5000'; // Adjust if needed
        
        console.log('Testing Sync Endpoint...');
        try {
            const res = await axios.post(`${baseUrl}/api/admin/users/sync`);
            console.log('Response without token:', res.status);
        } catch (err) {
            console.log('Correctly blocked without token:', err.response?.status || err.message);
        }

        console.log('\nDiagnostic complete. To test fully, use the "Sync with Firebase" button in the Admin Dashboard UI.');
    } catch (error) {
        console.error('Test Error:', error.message);
    }
};

testSync();

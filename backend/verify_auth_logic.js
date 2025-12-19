const axios = require('axios');

async function verifyAuth() {
    const email = 'dualrole@example.com';
    const password = 'Password123';
    const backendUrl = 'http://localhost:5000/api/auth';

    console.log('--- STARTING AUTH VERIFICATION ---');

    try {
        // 1. Try logging in as Customer
        console.log('\nTest 1: Logging in as Customer...');
        const customerRes = await axios.post(`${backendUrl}/login`, {
            identifier: email,
            password,
            role: 'customer'
        });
        console.log('✅ Success! Logged in as:', customerRes.data.role);

        // 2. Try logging in as Restaurant
        console.log('\nTest 2: Logging in as Restaurant...');
        const restoRes = await axios.post(`${backendUrl}/login`, {
            identifier: email,
            password,
            role: 'restaurant'
        });
        console.log('✅ Success! Logged in as:', restoRes.data.role);

        // 3. Try logging in as Rider (does not exist for this email)
        console.log('\nTest 3: Logging in as Rider (Should fail)...');
        try {
            await axios.post(`${backendUrl}/login`, {
                identifier: email,
                password,
                role: 'rider'
            });
            console.log('❌ Error: Logged in as rider incorrectly!');
        } catch (err) {
            console.log('✅ Correct Failure:', err.response?.data?.message);
        }

        // 4. Try logging in as Admin using this email (Should fail + suggest role)
        console.log('\nTest 4: Logging in as Admin (Should fail + suggest other roles)...');
        try {
            await axios.post(`${backendUrl}/login`, {
                identifier: email,
                password,
                role: 'admin'
            });
            console.log('❌ Error: Logged in as admin incorrectly!');
        } catch (err) {
            console.log('✅ Correct Failure:', err.response?.data?.message);
        }

        // 5. Try logging in as Admin with real admin email but wrong role
        console.log('\nTest 5: Logging in as Customer with Admin email...');
        try {
            await axios.post(`${backendUrl}/login`, {
                identifier: 'ayeshabarlas92@gmail.com',
                password,
                role: 'customer'
            });
            console.log('❌ Error: Logged in as customer incorrectly!');
        } catch (err) {
            console.log('✅ Correct Failure:', err.response?.data?.message);
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verifyAuth();

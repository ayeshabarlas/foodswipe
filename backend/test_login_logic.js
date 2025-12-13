const axios = require('axios');

async function testLogins() {
    const email = 'ayeshabarlas16@gmail.com';
    const password = 'password123'; // Assuming this is the password or whatever was set
    // Note: If password logic fails, we'll see 400 Invalid Credentials. 
    // If role logic works, we should see specific messages.

    console.log(`Testing login for ${email} with different roles...`);

    const roles = ['restaurant', 'customer', 'rider'];

    for (const role of roles) {
        console.log(`\n--- Attempting login as ${role.toUpperCase()} ---`);
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', {
                identifier: email,
                password: password,
                role: role
            });
            console.log(`SUCCESS [${role}]:`, res.data.role);
            console.log('Token:', res.data.token ? 'Received' : 'Missing');
        } catch (error) {
            console.log(`FAILED [${role}]:`, error.response?.status, error.response?.data);
        }
    }
}

testLogins();

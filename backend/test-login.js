const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing admin login...');
        console.log('Email: ayeshabarlas636@gmail.com');
        console.log('Password: admin123\n');

        const response = await axios.post('http://localhost:5000/api/admin/login', {
            identifier: 'ayeshabarlas636@gmail.com',
            password: 'admin123'
        });

        console.log('✅ LOGIN SUCCESSFUL!\n');
        console.log('Response:');
        console.log('  Name:', response.data.name);
        console.log('  Email:', response.data.email);
        console.log('  Role:', response.data.role);
        console.log('  Is Admin:', response.data.isAdmin);
        console.log('  Token:', response.data.token ? 'Generated ✅' : 'Missing ❌');

    } catch (error) {
        console.error('❌ LOGIN FAILED!\n');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLogin();

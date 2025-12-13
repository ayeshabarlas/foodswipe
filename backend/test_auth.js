async function testLogin() {
    try {
        console.log('Testing Login API...');
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'password123'
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);

        if (response.ok) {
            console.log('Login Successful!');
        } else {
            console.log('Login Failed!');
        }
    } catch (error) {
        console.error('Login Error:', error.message);
    }
}

async function testRegister() {
    try {
        console.log('\nTesting Register API...');
        const email = `test${Date.now()}@example.com`;
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: email,
                password: 'password123',
                phone: '1234567890'
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);

        if (response.ok) {
            console.log('Register Successful!');
        } else {
            console.log('Register Failed!');
        }
    } catch (error) {
        console.error('Register Error:', error.message);
    }
}

async function runTests() {
    await testRegister();
    await testLogin();
}

runTests();

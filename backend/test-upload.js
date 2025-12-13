// Test upload endpoint
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function testUpload() {
    try {
        // Create a simple test image file
        const testImagePath = path.join(__dirname, 'test-image.txt');
        fs.writeFileSync(testImagePath, 'This is a test file');

        const form = new FormData();
        form.append('file', fs.createReadStream(testImagePath), {
            filename: 'test.png',
            contentType: 'image/png'
        });

        console.log('🧪 Testing upload endpoint...');

        const response = await axios.post('http://localhost:5000/api/upload', form, {
            headers: form.getHeaders()
        });

        console.log('✅ Upload test successful!');
        console.log('Response:', response.data);

        // Cleanup
        fs.unlinkSync(testImagePath);
    } catch (error) {
        console.error('❌ Upload test failed:');
        console.error('Error:', error.response?.data || error.message);
    }
}

testUpload();

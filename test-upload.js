
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const uploadTest = async () => {
    try {
        const form = new FormData();
        // Create a dummy file
        fs.writeFileSync('test_upload.txt', 'This is a test file');
        form.append('file', fs.createReadStream('test_upload.txt'));

        const response = await axios.post('http://localhost:5000/api/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Upload Success:', response.data);
    } catch (error) {
        console.error('Upload Failed:', error.response ? error.response.data : error.message);
    } finally {
        if (fs.existsSync('test_upload.txt')) {
            fs.unlinkSync('test_upload.txt');
        }
    }
};

uploadTest();

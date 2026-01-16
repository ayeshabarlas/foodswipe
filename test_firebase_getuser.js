const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('./backend/serviceAccountKey.json', 'utf8'));
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function test() {
  try {
    const email = 'cfahad18@gmail.com';
    console.log(`Attempting to get user by email: ${email}`);
    const user = await admin.auth().getUserByEmail(email);
    console.log('Success! Found user:', user.uid);
    process.exit(0);
  } catch (error) {
    console.error('Test failed:');
    console.error(error.message);
    process.exit(1);
  }
}

test();

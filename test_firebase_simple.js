const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync('./backend/serviceAccountKey.json', 'utf8'));

// Fix private key just in case
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function test() {
  try {
    console.log('Attempting to list users...');
    const list = await admin.auth().listUsers(1);
    console.log('Success! Found users:', list.users.length);
    process.exit(0);
  } catch (error) {
    console.error('Test failed:');
    console.error(error);
    process.exit(1);
  }
}

test();

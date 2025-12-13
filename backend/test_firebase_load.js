const dotenv = require('dotenv');
dotenv.config();

try {
    console.log("Loading firebase config with env...");
    const firebase = require('./config/firebase');
    console.log("Firebase loaded successfully:", firebase);
} catch (error) {
    console.error("Caught error loading firebase:", error);
}

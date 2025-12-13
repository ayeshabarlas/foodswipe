const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');

console.log("Testing DB connection...");
try {
    connectDB().then(() => {
        console.log("DB connection logic executed (promise pending or resolved)");
    }).catch(err => {
        console.error("DB connection promise rejected:", err);
    });
} catch (error) {
    console.error("Caught error calling connectDB:", error);
}

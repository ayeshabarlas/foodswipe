const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const routesDir = path.join(__dirname, 'routes');

fs.readdir(routesDir, (err, files) => {
    if (err) {
        console.error("Error reading routes dir:", err);
        return;
    }

    files.forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(routesDir, file);
            try {
                console.log(`Loading route: ${file}...`);
                require(filePath);
                console.log(`✅ Loaded ${file}`);
            } catch (error) {
                console.error(`❌ Failed to load ${file}:`, error);
            }
        }
    });
});

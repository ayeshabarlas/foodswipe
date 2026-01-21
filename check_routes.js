const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const routesDir = path.join(__dirname, 'backend', 'routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
    if (file.endsWith('.js')) {
        console.log(`Checking ${file}...`);
        try {
            const route = require(path.join(routesDir, file));
            if (route.stack) {
                route.stack.forEach(layer => {
                    if (layer.route) {
                        const methods = Object.keys(layer.route.methods);
                        const path = layer.route.path;
                        layer.route.stack.forEach(handler => {
                            if (typeof handler.handle !== 'function') {
                                console.error(`❌ Undefined handler in ${file} for ${methods.join(',').toUpperCase()} ${path}`);
                            }
                        });
                    }
                });
            }
        } catch (err) {
            console.error(`🔥 Error loading ${file}:`, err.message);
        }
    }
});

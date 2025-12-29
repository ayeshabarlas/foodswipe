const mongoose = require('mongoose');
const Dish = require('./models/Dish');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const dishes = await Dish.find({});
        console.log(`--- FOUND ${dishes.length} DISHES ---`);
        dishes.forEach(d => {
            console.log(`Dish: ${d.name} | Restaurant: ${d.restaurant}`);
        });
        console.log('-----------------');
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
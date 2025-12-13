// Temporary debug route - add this to server.js temporarily
app.get('/api/debug/check-restaurant', async (req, res) => {
    try {
        const Restaurant = require('./models/Restaurant');
        const userId = req.headers['user-id']; // Pass user ID in header for debugging

        console.log('Checking for user ID:', userId);

        // Find all restaurants
        const allRestaurants = await Restaurant.find({}).select('name owner');
        console.log('All restaurants:', allRestaurants);

        // Find restaurant by owner
        const myRestaurant = await Restaurant.findOne({ owner: userId });
        console.log('My restaurant:', myRestaurant);

        res.json({
            userId,
            allRestaurants,
            myRestaurant
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

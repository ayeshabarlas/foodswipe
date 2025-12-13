const express = require('express');
const router = express.Router();
const {
    searchDishes,
    searchRestaurants,
    getAutocomplete,
} = require('../controllers/searchController');

// Search routes
router.get('/dishes', searchDishes);
router.get('/restaurants', searchRestaurants);
router.get('/autocomplete', getAutocomplete);

module.exports = router;

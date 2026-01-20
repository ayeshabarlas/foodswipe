const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getSettings)
    .put(protectAdmin, updateSettings);

module.exports = router;

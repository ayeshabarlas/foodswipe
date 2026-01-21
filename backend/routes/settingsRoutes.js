const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getSettings)
    .put(protect, requireAdmin, updateSettings);

module.exports = router;

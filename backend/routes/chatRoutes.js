const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:orderId', protect, getChatHistory);
router.post('/:orderId', protect, sendMessage);

module.exports = router;

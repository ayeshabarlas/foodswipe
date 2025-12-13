const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const { getTickets, updateTicket, createTicket } = require('../controllers/ticketController');

router.get('/', protect, requireAdmin, getTickets);
router.post('/', protect, createTicket);
router.put('/:id', protect, requireAdmin, updateTicket);

module.exports = router;

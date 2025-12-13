const Ticket = require('../models/Ticket');

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private/Admin
const getTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({})
            .populate('user', 'name email')
            .populate('assignee', 'name')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update ticket status
// @route   PUT /api/tickets/:id
// @access  Private/Admin
const updateTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (ticket) {
            ticket.status = req.body.status || ticket.status;
            ticket.priority = req.body.priority || ticket.priority;
            ticket.assignee = req.body.assignee || ticket.assignee;

            const updatedTicket = await ticket.save();
            res.json(updatedTicket);
        } else {
            res.status(404).json({ message: 'Ticket not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a ticket (for testing/seeding)
// @route   POST /api/tickets
// @access  Private
const createTicket = async (req, res) => {
    try {
        const { subject, description, priority, orderId } = req.body;
        const ticket = await Ticket.create({
            user: req.user._id,
            subject,
            description,
            priority,
            order: orderId
        });
        res.status(201).json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTickets, updateTicket, createTicket };

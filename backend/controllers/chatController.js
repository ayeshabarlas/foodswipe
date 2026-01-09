const Message = require('../models/Message');
const Order = require('../models/Order');
const { triggerEvent } = require('../socket');

// @desc    Get chat history for an order
// @route   GET /api/chat/:orderId
// @access  Private
exports.getChatHistory = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Verify order exists and user has access
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Access control: Only customer, restaurant, or rider of the order can see the chat
        const isCustomer = order.user.toString() === req.user._id.toString();
        const isRestaurant = order.restaurant.toString() === req.user.restaurantId?.toString();
        const isRider = order.rider?.toString() === req.user.riderId?.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isCustomer && !isRestaurant && !isRider && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view this chat' });
        }

        const messages = await Message.find({ order: orderId })
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Send a new message
// @route   POST /api/chat/:orderId
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { text, senderRole, senderName } = req.body;

        const message = await Message.create({
            order: orderId,
            sender: req.user._id,
            senderRole,
            senderName,
            text
        });

        // Trigger Pusher event for real-time chat
        triggerEvent(`order-${orderId}`, 'newMessage', {
            orderId,
            message: {
                id: message._id,
                text: message.text,
                sender: message.senderRole,
                senderName: message.senderName,
                senderId: message.sender,
                timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                createdAt: message.createdAt
            }
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Save a message (usually called via socket, but here for reference/API)
exports.saveMessage = async (orderId, senderId, senderRole, senderName, text) => {
    try {
        const message = await Message.create({
            order: orderId,
            sender: senderId,
            senderRole,
            senderName,
            text
        });
        return message;
    } catch (error) {
        console.error('Save message error:', error);
        throw error;
    }
};

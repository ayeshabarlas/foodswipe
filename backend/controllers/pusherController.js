const { getPusher } = require('../socket');

/**
 * @desc    Authenticate Pusher channel
 * @route   POST /api/pusher/auth
 * @access  Private
 */
const authenticate = async (req, res) => {
    try {
        const socketId = req.body.socket_id;
        const channel = req.body.channel_name;
        
        const pusher = getPusher();
        
        if (!pusher) {
            return res.status(500).json({ message: 'Pusher not initialized' });
        }

        // Presence data (optional, but good for tracking users online)
        const presenceData = {
            user_id: req.user._id.toString(),
            user_info: {
                name: req.user.name,
                role: req.user.role
            }
        };

        const auth = pusher.authenticate(socketId, channel, presenceData);
        res.send(auth);
    } catch (error) {
        console.error('Pusher auth error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    authenticate
};

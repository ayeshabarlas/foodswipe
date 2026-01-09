const Pusher = require('pusher');

let pusher;

const initSocket = () => {
    pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
    });
    
    console.log('✅ Pusher Real-time initialized');
    return pusher;
};

const getPusher = () => {
    if (!pusher) return initSocket();
    return pusher;
};

// Helper functions to trigger events (replacing socket.emit)
const triggerEvent = (channel, event, data) => {
    const p = getPusher();
    p.trigger(channel, event, data).catch(err => {
        console.error('❌ Pusher Trigger Error:', err);
    });
};

module.exports = { initSocket, getPusher, triggerEvent };

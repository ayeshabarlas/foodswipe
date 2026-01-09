const Pusher = require('pusher');

let pusher;

const initSocket = () => {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
        console.warn('⚠️ Pusher environment variables are missing. Real-time features will not work.');
        return null;
    }

    try {
        pusher = new Pusher({
            appId,
            key,
            secret,
            cluster,
            useTLS: true
        });
        
        console.log('✅ Pusher Real-time initialized');
        return pusher;
    } catch (err) {
        console.error('❌ Pusher Initialization Error:', err.message);
        return null;
    }
};

const getPusher = () => {
    if (!pusher) return initSocket();
    return pusher;
};

// Helper functions to trigger events (replacing socket.emit)
const triggerEvent = (channel, event, data) => {
    const p = getPusher();
    if (!p) {
        console.warn(`📢 Event ${event} not sent: Pusher not initialized.`);
        return;
    }
    p.trigger(channel, event, data).catch(err => {
        console.error('❌ Pusher Trigger Error:', err);
    });
};

module.exports = { initSocket, getPusher, triggerEvent };

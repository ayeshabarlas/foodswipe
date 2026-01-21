const Admin = require('../models/Admin');
const User = require('../models/User');
const sendEmail = require('./email');
const { triggerEvent } = require('../socket');

/**
 * Notifies all super-admins via Email and Socket.io
 * @param {string} subject - Email subject
 * @param {string} message - Notification message
 * @param {string} type - Notification type (e.g., 'new_order', 'new_restaurant')
 * @param {Object} data - Additional data for socket event
 */
const notifyAdmins = async (subject, message, type = 'general_notification', data = {}) => {
    try {
        console.log(`🔔 Admin Notification: ${subject}`);
        
        // 1. Socket.io Notification (for real-time dashboard badges)
        triggerEvent('admin', 'notification_received', {
            type,
            message,
            subject,
            data,
            timestamp: new Date()
        });

        // 2. Email Notification
        // Fetch from both Admin and User collections
        const [adminsFromAdminColl, adminsFromUserColl] = await Promise.all([
            Admin.find({ 
                $or: [
                    { role: 'super-admin' },
                    { role: 'admin' }
                ]
            }),
            User.find({ 
                role: { $in: ['admin', 'super-admin'] }
            })
        ]);
        
        const adminEmails = [
            ...adminsFromAdminColl.map(a => a.email),
            ...adminsFromUserColl.map(u => u.email)
        ].filter(email => !!email && email.includes('@'));

        // Remove duplicates and add the support email
        const uniqueEmails = [...new Set([...adminEmails, 'app.foodswiphelp@gmail.com'])];

        if (uniqueEmails.length > 0) {
            await sendEmail({
                email: uniqueEmails.join(','),
                subject: `[FoodSwipe Admin] ${subject}`,
                message: message,
                html: `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #e91e63;">FoodSwipe Admin Alert</h2>
                        <p style="font-size: 16px;">${message}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #666;">This is an automated notification from the FoodSwipe System.</p>
                    </div>
                `
            });
            console.log(`✅ Admin email sent to: ${adminEmails.length} recipients`);
        }
    } catch (error) {
        console.error('❌ Error in notifyAdmins:', error);
    }
};

module.exports = { notifyAdmins };

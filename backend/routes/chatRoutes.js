const express = require('express');
const router = express.Router();

// Simple AI response logic (can be replaced with OpenAI API later)
const getAIResponse = (userMessage) => {
    const msg = userMessage.toLowerCase();

    if (msg.includes('track') || msg.includes('order') || msg.includes('where')) {
        return "I can help you track your order! Your order #1234 is currently out for delivery and should arrive in approximately 15 minutes. The rider is just 2.5 km away. Would you like to see the live tracking map?";
    } else if (msg.includes('payment') || msg.includes('pay') || msg.includes('card')) {
        return "I'm here to help with payment issues. Could you please specify what payment problem you're experiencing? Common issues include:\n• Failed transactions\n• Refund requests\n• Changing payment methods\n• Duplicate charges\n\nWhich one applies to you?";
    } else if (msg.includes('cancel')) {
        return "I understand you'd like to cancel your order. Please note that orders can only be cancelled within 2 minutes of placement if the restaurant hasn't started preparing it yet. Let me check your most recent order... Your order #1234 was placed 5 minutes ago and is already being prepared. Unfortunately, it cannot be cancelled now. However, you can refuse delivery if needed.";
    } else if (msg.includes('address') || msg.includes('location')) {
        return "You can change your delivery address! Here's how:\n1. Go to My Profile from the menu\n2. Click on 'Saved Addresses'\n3. Add or edit your address\n\nFor an active order, please contact the restaurant directly through the Order Tracking screen to update the delivery location.";
    } else if (msg.includes('restaurant') || msg.includes('contact')) {
        return "I can help you contact the restaurant directly! To reach the restaurant:\n1. Go to Order Tracking\n2. Click 'Call Rider' or find the restaurant's contact info\n3. You can also message them through the app\n\nWhich restaurant do you need to contact?";
    } else if (msg.includes('refund') || msg.includes('money back')) {
        return "I'll help you with the refund process. Refunds are processed in these cases:\n• Order not delivered\n• Wrong items received\n• Quality issues\n• Order cancelled by restaurant\n\nRefunds take 5-7 business days to reflect in your account. Would you like to file a refund request?";
    } else if (msg.includes('coupon') || msg.includes('discount') || msg.includes('promo')) {
        return "Great question about discounts! Here's how to use coupons:\n1. Go to 'Discounts & Vouchers' in the menu\n2. Browse available offers\n3. Click 'Copy' on any voucher\n4. Apply at checkout\n\nWe currently have 9 amazing offers including 50% off your first order! Check them out now! 🎉";
    } else if (msg.includes('late') || msg.includes('delay')) {
        return "I apologize for the delay! Let me check your order status... Common reasons for delays include:\n• High order volume\n• Traffic conditions\n• Weather\n\nYour rider is on the way. If your order is more than 30 minutes late, you'll receive a discount on your next order automatically. Would you like me to escalate this to our support team?";
    } else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
        return "Hello! 👋 I'm your FoodSwipe AI assistant. I'm here to help you with:\n• Order tracking & delivery status\n• Payment & refund issues\n• Account management\n• Restaurant inquiries\n• Discounts & promotions\n\nWhat can I help you with today?";
    } else if (msg.includes('thanks') || msg.includes('thank you')) {
        return "You're very welcome! 😊 I'm happy to help. Is there anything else you'd like assistance with today?";
    } else {
        return "Thank you for your message! I'm here to help with:\n• Order tracking\n• Payment issues\n• Restaurant inquiries\n• Account settings\n• Refunds and complaints\n\nCould you please provide more details about what you need help with? Or feel free to use the quick reply buttons below for common requests.";
    }
};

// POST /api/chat - Send message and get AI response
router.post('/', async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Simulate thinking time (remove this for instant responses)
        await new Promise(resolve => setTimeout(resolve, 500));

        const aiResponse = getAIResponse(message);

        res.json({
            success: true,
            response: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            response: "I apologize, but I'm having trouble processing your request right now. Please try again or contact our support team at 1-800-FOODSWIPE for immediate assistance."
        });
    }
});

module.exports = router;

const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        console.log('createOrder body:', req.body);
        console.log('createOrder user:', req.user);

        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { items, restaurant, deliveryAddress, totalAmount, paymentMethod, deliveryInstructions } = req.body;

        // Map frontend data to model schema
        const orderItems = items.map(item => ({
            name: item.name,
            qty: item.quantity,
            image: item.image,
            price: item.price,
            product: item.dish
        }));

        const shippingAddress = {
            address: deliveryInstructions ? `${deliveryAddress} (Note: ${deliveryInstructions})` : deliveryAddress,
            city: 'Lahore', // Default for now
            postalCode: '54000', // Default for now
            country: 'Pakistan' // Default for now
        };

        const order = await Order.create({
            user: req.user._id,
            restaurant,
            orderItems,
            shippingAddress,
            paymentMethod: paymentMethod || 'COD',
            totalPrice: totalAmount,
            status: 'Pending',
        });

        // Auto-decrement stock for ordered items
        for (const item of items) {
            if (item.dish) {
                const dish = await Dish.findById(item.dish);
                if (dish && dish.stockQuantity !== null) {
                    const newStock = dish.stockQuantity - item.quantity;
                    dish.stockQuantity = Math.max(0, newStock);

                    if (newStock < 0) {
                        console.warn(`Warning: Dish "${dish.name}" stock went negative. OrderID: ${order._id}`);
                    }

                    await dish.save();
                }
            }
        }

        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact');

        // Emit socket event for real-time update to restaurant
        if (req.app.get('io')) {
            req.app.get('io').to(`restaurant_${restaurant}`).emit('newOrder', populatedOrder);
        }

        res.status(201).json(populatedOrder);
    } catch (error) {
        console.error('createOrder Error:', error);
        const fs = require('fs');
        fs.writeFileSync('backend_error.log', `Error: ${error.message}\nStack: ${error.stack}\nBody: ${JSON.stringify(req.body, null, 2)}\nUser: ${JSON.stringify(req.user)}\n`);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get user orders
// @route   GET /api/orders/my-orders
// @access  Private
const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('restaurant', 'name logo')
            .sort({ createdAt: -1 });

        // Transform orders to match frontend expectations
        const transformedOrders = orders.map(order => ({
            _id: order._id,
            restaurant: order.restaurant,
            items: order.orderItems.map(item => ({
                name: item.name,
                quantity: item.qty,
                price: item.price,
            })),
            totalAmount: order.totalPrice,
            status: order.status,
            createdAt: order.createdAt,
            deliveryAddress: order.shippingAddress?.address || 'No address provided',
        }));

        res.json(transformedOrders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact logo')
            .populate({
                path: 'rider',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns this order or is admin/restaurant
        if (
            order.user._id.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin' &&
            req.user.role !== 'restaurant'
        ) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Restaurant/Admin)
const updateOrderStatus = async (req, res) => {
    try {
        const { status, cancellationReason, prepTime, delayedUntil, delayReason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.status = status;
        if (status === 'Cancelled' && cancellationReason) {
            order.cancellationReason = cancellationReason;
        }
        if (prepTime) order.prepTime = prepTime;
        if (delayedUntil) order.delayedUntil = delayedUntil;
        if (delayReason) order.delayReason = delayReason;

        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact location');

        // Emit socket events for real-time updates
        if (req.app.get('io')) {
            const io = req.app.get('io');

            // Notify specific user about their order update
            io.to(`user_${order.user._id}`).emit('orderStatusUpdate', updatedOrder);

            // Notify restaurant about order update
            io.to(`restaurant_${order.restaurant._id}`).emit('orderStatusUpdate', updatedOrder);

            // When order is ready and handed to rider, notify all available riders
            if (status === 'OnTheWay') {
                io.to('riders').emit('newOrderAvailable', {
                    orderId: updatedOrder._id,
                    restaurant: {
                        _id: updatedOrder.restaurant._id,
                        name: updatedOrder.restaurant.name,
                        address: updatedOrder.restaurant.address,
                        location: updatedOrder.restaurant.location
                    },
                    deliveryAddress: updatedOrder.shippingAddress.address,
                    totalPrice: updatedOrder.totalPrice,
                    orderItems: updatedOrder.orderItems
                });
            }
        }

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant/my-orders
// @access  Private (Restaurant)
const getRestaurantOrders = async (req, res) => {
    try {
        // Find restaurant owned by this user
        const restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const orders = await Order.find({ restaurant: restaurant._id })
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private (Restaurant)
const cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify restaurant ownership
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant || order.restaurant.toString() !== restaurant._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this order' });
        }

        // Don't allow cancellation of already delivered/cancelled orders
        if (['Delivered', 'Cancelled'].includes(order.status)) {
            return res.status(400).json({ message: 'Cannot cancel this order' });
        }

        // Update order status
        order.status = 'Cancelled';
        order.cancellationReason = reason;
        order.cancelledAt = new Date();
        await order.save();

        // Restore stock for cancelled items
        for (const item of order.orderItems) {
            if (item.product) {
                const dish = await Dish.findById(item.product);
                if (dish && dish.stockQuantity !== null) {
                    dish.stockQuantity += item.qty;
                    await dish.save();
                }
            }
        }

        // Emit socket event for real-time update (customer notification)
        if (req.app.get('io')) {
            req.app.get('io').emit('orderCancelled', {
                orderId: order._id,
                reason,
                userId: order.user
            });
        }

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    getRestaurantOrders,
    cancelOrder,
};

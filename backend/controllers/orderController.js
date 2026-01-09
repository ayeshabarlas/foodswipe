const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');
const Rider = require('../models/Rider');
const RestaurantWallet = require('../models/RestaurantWallet');
const RiderWallet = require('../models/RiderWallet');
const Transaction = require('../models/Transaction');
const { calculateRiderEarning, calculateDeliveryFee } = require('../utils/paymentUtils');
const { triggerEvent } = require('../socket');

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

        const { items, restaurant, deliveryAddress, deliveryLocation, totalAmount, paymentMethod, deliveryInstructions, subtotal, deliveryFee } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Check if restaurant exists and is approved
        const restaurantExists = await Restaurant.findById(restaurant);
        if (!restaurantExists) {
            return res.status(404).json({ message: 'Restaurant not registered or not found' });
        }

        if (restaurantExists.verificationStatus !== 'approved') {
            return res.status(400).json({ message: 'Restaurant is not yet approved for orders' });
        }

        // Map frontend data to model schema with fallback for image
        const orderItems = await Promise.all(items.map(async item => {
            let itemImage = item.image;
            const dishId = item.dish || item._id || item.product;
            
            // If image is missing, try to fetch it from the Dish model
            if (!itemImage && dishId) {
                try {
                    const dish = await Dish.findById(dishId);
                    if (dish && dish.image) {
                        itemImage = dish.image;
                    }
                } catch (err) {
                    console.error('Error fetching dish image for order:', err);
                }
            }

            return {
                name: item.name,
                qty: item.quantity || item.qty,
                image: itemImage || '', // Fallback to empty string if still missing
                price: item.price,
                product: dishId
            };
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
            deliveryLocation: deliveryLocation || null,
            paymentMethod: paymentMethod || 'COD',
            totalPrice: totalAmount,
            subtotal: subtotal || (totalAmount - (deliveryFee || 0)),
            deliveryFee: deliveryFee || 0,
            deliveryFeeCustomerPaid: deliveryFee || 0,
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

const { triggerEvent } = require('../socket');

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

        const { items, restaurant, deliveryAddress, deliveryLocation, totalAmount, paymentMethod, deliveryInstructions, subtotal, deliveryFee } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Check if restaurant exists and is approved
        const restaurantExists = await Restaurant.findById(restaurant);
        if (!restaurantExists) {
            return res.status(404).json({ message: 'Restaurant not registered or not found' });
        }

        if (restaurantExists.verificationStatus !== 'approved') {
            return res.status(400).json({ message: 'Restaurant is not yet approved for orders' });
        }

        // Map frontend data to model schema with fallback for image
        const orderItems = await Promise.all(items.map(async item => {
            let itemImage = item.image;
            const dishId = item.dish || item._id || item.product;
            
            // If image is missing, try to fetch it from the Dish model
            if (!itemImage && dishId) {
                try {
                    const dish = await Dish.findById(dishId);
                    if (dish && dish.image) {
                        itemImage = dish.image;
                    }
                } catch (err) {
                    console.error('Error fetching dish image for order:', err);
                }
            }

            return {
                name: item.name,
                qty: item.quantity || item.qty,
                image: itemImage || '', // Fallback to empty string if still missing
                price: item.price,
                product: dishId
            };
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
            deliveryLocation: deliveryLocation || null,
            paymentMethod: paymentMethod || 'COD',
            totalPrice: totalAmount,
            subtotal: subtotal || (totalAmount - (deliveryFee || 0)),
            deliveryFee: deliveryFee || 0,
            deliveryFeeCustomerPaid: deliveryFee || 0,
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

        // Emit Pusher events for real-time update to restaurant and admin
        triggerEvent(`restaurant-${restaurant}`, 'newOrder', populatedOrder);
        triggerEvent('admin', 'order_created', populatedOrder);

        res.status(201).json(populatedOrder);
    } catch (error) {
        console.error('createOrder Error:', error);
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
// @access  Private (Restaurant/Admin/Rider)
const updateOrderStatus = async (req, res) => {
    try {
        const { status, cancellationReason, prepTime, delayedUntil, delayReason, distanceKm } = req.body;
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

        // If order is delivered, trigger payment processing
        if (status === 'Delivered') {
            await processOrderCompletion(order, distanceKm || 5, req); // Pass req to access io
        }

        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact location')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        // Emit Pusher events for real-time updates
        // Notify specific user about their order update
        triggerEvent(`user-${order.user._id}`, 'orderStatusUpdate', updatedOrder);

        // Notify restaurant about order update
        triggerEvent(`restaurant-${order.restaurant._id}`, 'orderStatusUpdate', updatedOrder);

        // Always notify admin about any order status update
        triggerEvent('admin', 'order_updated', updatedOrder);

        // When order is ready, notify all available riders
        if (status === 'Ready') {
            triggerEvent('riders', 'newOrderAvailable', {
                _id: updatedOrder._id,
                restaurant: {
                    _id: updatedOrder.restaurant._id,
                    name: updatedOrder.restaurant.name,
                    address: updatedOrder.restaurant.address,
                    location: updatedOrder.restaurant.location
                },
                shippingAddress: {
                    address: updatedOrder.shippingAddress.address
                },
                totalPrice: updatedOrder.totalPrice,
                orderItems: updatedOrder.orderItems,
                createdAt: updatedOrder.createdAt
            });
        }

        // Also notify specifically assigned rider if any
        if (order.rider) {
            triggerEvent(`rider-${order.rider._id}`, 'orderStatusUpdate', updatedOrder);
        }

        res.json(updatedOrder);
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Helper to process order completion payments
 */
const processOrderCompletion = async (order, distanceKm = 5, req = null) => {
    try {
        if (!order.rider) return; // No rider assigned

        // 1. Calculate split payments
        const subtotal = order.subtotal || 0;
        const deliveryFee = order.deliveryFee || 0;
        const discount = order.discount || 0;
        const commissionRate = order.commissionRate || 10;
        const gatewayFee = order.paymentMethod !== 'COD' ? subtotal * 0.025 : 0; // 2.5% gateway fee for online payments

        const commissionAmount = (subtotal * commissionRate) / 100;
        const restaurantEarning = subtotal - commissionAmount;
        const riderEarning = calculateRiderEarning(distanceKm).netEarning; // Use existing rider earning logic
        const platformRevenue = commissionAmount - gatewayFee;

        // 2. Update order with payment details
        order.distanceKm = distanceKm;
        order.commissionAmount = commissionAmount;
        order.restaurantEarning = restaurantEarning;
        order.riderEarning = riderEarning;
        order.platformRevenue = platformRevenue;
        order.gatewayFee = gatewayFee;
        order.isPaid = true; // Mark as paid upon delivery (COD or Online)
        order.paidAt = new Date();
        order.completedAt = new Date();
        order.deliveredAt = new Date();

        // 3. Update Rider Wallet & Stats
        // Try to find rider by ID or by user ID to be safe
        let rider = await Rider.findById(order.rider).populate('user');
        if (!rider) {
            rider = await Rider.findOne({ user: order.rider }).populate('user');
        }

        if (rider) {
            rider.walletBalance = (rider.walletBalance || 0) + riderEarning;
            
            // Update earnings stats
            rider.earnings.total += riderEarning;
            rider.earnings.today += riderEarning;
            rider.earnings.thisWeek += riderEarning;
            rider.earnings.thisMonth += riderEarning;
            
            // Increment total orders
            rider.stats.completedDeliveries = (rider.stats.completedDeliveries || 0) + 1;
            rider.stats.totalDeliveries = (rider.stats.totalDeliveries || 0) + 1;

            await rider.save();

            // Also update RiderWallet model if it exists
            let riderWallet = await RiderWallet.findOne({ rider: rider._id });
            if (riderWallet) {
                riderWallet.deliveryEarnings += riderEarning;
                riderWallet.totalEarnings += riderEarning;
                riderWallet.availableWithdraw += riderEarning;
                if (order.paymentMethod === 'COD') {
                    riderWallet.cashCollected += order.totalPrice;
                    riderWallet.cashToDeposit += order.totalPrice;
                }
                await riderWallet.save();
            }

            // Create Transaction for Rider
            await Transaction.create({
                entityType: 'rider',
                entityId: rider._id,
                entityModel: 'Rider',
                order: order._id,
                type: 'earning',
                amount: riderEarning,
                balanceAfter: rider.walletBalance,
                description: `Earning for order #${order.orderNumber || order._id.toString().slice(-6)}`,
                metadata: { distanceKm, deliveryFee }
            });

            // Create Notification for Rider
            const riderUserId = rider.user._id || rider.user;
            const notification = await createNotification(
                riderUserId,
                'Payment Received',
                `PKR ${riderEarning.toLocaleString()} deposited to your account`,
                'payment',
                { orderId: order._id, amount: riderEarning }
            );

            // Emit Real-time Notification
            triggerEvent(`user-${riderUserId}`, 'notification', notification);
        }

        // 4. Update Restaurant Wallet & Stats
        let restaurantWallet = await RestaurantWallet.findOne({ restaurant: order.restaurant });
        if (!restaurantWallet) {
            restaurantWallet = await RestaurantWallet.create({ restaurant: order.restaurant });
        }

        restaurantWallet.availableBalance += restaurantEarning;
        restaurantWallet.totalEarnings += restaurantEarning;
        restaurantWallet.totalCommissionCollected += commissionAmount;
        restaurantWallet.pendingPayout += restaurantEarning;
        await restaurantWallet.save();

        // Create Transaction for Restaurant
        await Transaction.create({
            entityType: 'restaurant',
            entityId: order.restaurant,
            entityModel: 'Restaurant',
            order: order._id,
            type: 'earning',
            amount: restaurantEarning,
            balanceAfter: restaurantWallet.availableBalance,
            description: `Earning for order #${order.orderNumber || order._id.toString().slice(-6)}`,
            metadata: { subtotal, commissionAmount }
        });

        // 5. Create Transaction for Admin/Platform (Commission)
        await Transaction.create({
            entityType: 'admin',
            entityId: null, // Platform doesn't have a specific ID in this context
            order: order._id,
            type: 'commission',
            amount: commissionAmount,
            balanceAfter: 0, // Platform balance not tracked in a single wallet here
            description: `Commission from order #${order.orderNumber || order._id.toString().slice(-6)}`
        });

        await order.save();

    } catch (error) {
        console.error('Process order completion error:', error);
        throw error;
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
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            })
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
        triggerEvent(`user-${order.user}`, 'orderCancelled', {
            orderId: order._id,
            reason,
            userId: order.user
        });

        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Complete order and process payments
// @route   POST /api/orders/:id/complete
// @access  Private (Rider/Admin)
const completeOrder = async (req, res) => {
    try {
        const { distanceKm } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Order already delivered' });
        }

        order.status = 'Delivered';
        await processOrderCompletion(order, distanceKm || 5);
        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact location')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        // Emit Pusher events
        triggerEvent(`user-${order.user}`, 'orderStatusUpdate', updatedOrder);
        triggerEvent(`restaurant-${order.restaurant}`, 'orderStatusUpdate', updatedOrder);
        triggerEvent('admin', 'order_updated', updatedOrder);

        res.json(updatedOrder);
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get active orders for logged in user
// @route   GET /api/orders/user/active
// @access  Private
const getActiveUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            user: req.user._id,
            status: { $in: ['Pending', 'Accepted', 'Preparing', 'Ready', 'OnTheWay', 'Confirmed', 'Arrived', 'Picked Up', 'ArrivedAtCustomer'] }
        })
            .sort({ createdAt: -1 })
            .populate('restaurant', 'name address logo location')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        res.json(orders);
    } catch (error) {
        console.error('Get active user orders error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update order location (Rider live tracking)
// @route   POST /api/orders/:id/location
// @access  Private (Rider)
const updateOrderLocation = async (req, res) => {
    try {
        const { location } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update location in DB
        order.deliveryLocation = location;
        await order.save();

        // Trigger Pusher event for real-time tracking
        triggerEvent(`user-${order.user}`, 'riderLocationUpdate', {
            orderId: order._id,
            location
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update order location error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getActiveUserOrders,
    getOrderById,
    updateOrderStatus,
    completeOrder,
    getRestaurantOrders,
    cancelOrder,
    updateOrderLocation
};

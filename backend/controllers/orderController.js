const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');
const Rider = require('../models/Rider');
const RestaurantWallet = require('../models/RestaurantWallet');
const RiderWallet = require('../models/RiderWallet');
const Transaction = require('../models/Transaction');
const CODLedger = require('../models/CODLedger');
const Settings = require('../models/Settings');
const { calculateRiderEarning, calculateDeliveryFee, updateRiderEarningsWithReset } = require('../utils/paymentUtils');
const { calculateDistance } = require('../utils/locationUtils');
const { triggerEvent } = require('../socket');
const { notifyAdmins } = require('../utils/adminNotifier');
const { createNotification } = require('./notificationController');

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

        const { 
            items, 
            restaurant, 
            deliveryAddress, 
            deliveryLocation, 
            totalAmount, 
            paymentMethod, 
            deliveryInstructions, 
            subtotal, 
            deliveryFee,
            serviceFee,
            tax,
            promoCode
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Get system settings
        const settings = await Settings.getSettings();

        // Check for maintenance mode
        if (settings.isMaintenanceMode) {
            return res.status(503).json({ message: 'System is currently under maintenance. Please try again later.' });
        }

        // Check for minimum order amount
        if (settings.minimumOrderAmount > 0 && subtotal < settings.minimumOrderAmount) {
            return res.status(400).json({ message: `Minimum order amount is Rs. ${settings.minimumOrderAmount}` });
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
            let dishId = item.dish || item._id || item.product;
            
            // Clean dishId if it has suffixes like -combo or -drink
            if (typeof dishId === 'string' && dishId.includes('-')) {
                dishId = dishId.split('-')[0];
            }

            // VALIDATION: Ensure dishId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(dishId)) {
                console.error(`[Order] Invalid Dish ID detected: ${dishId}. Item name: ${item.name}`);
                // We can't easily skip here inside Promise.all map without changing logic, 
                // but let's at least log it. The Order.create will still fail if this is required.
            }

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
            address: (deliveryAddress || 'No address provided') + (deliveryInstructions ? ` (Note: ${deliveryInstructions})` : ''),
            city: req.body.city || 'Pakistan', // Use provided city or default
            postalCode: req.body.postalCode || '',
            country: 'Pakistan'
        };

        // Calculate commission and earnings early for display in dashboard
        // Use system-wide commission rate if restaurant doesn't have a specific one
        const commissionPercent = (restaurantExists.commissionRate !== undefined && restaurantExists.commissionRate !== null) 
            ? restaurantExists.commissionRate 
            : (settings.commissionRate || (restaurantExists.businessType === 'home-chef' ? 10 : 15));
        
        const subtotalValue = subtotal || (totalAmount - (deliveryFee || 0));
        const commissionAmount = (subtotalValue * commissionPercent) / 100;
        const restaurantEarning = subtotalValue - commissionAmount;

        // Calculate Distance and Rider Earnings on backend for accuracy
        let distanceKm = 0;
        let finalDeliveryFee = deliveryFee || 0;

        if (deliveryLocation && restaurantExists.location?.coordinates) {
            const [restLng, restLat] = restaurantExists.location.coordinates;
            distanceKm = calculateDistance(restLat, restLng, deliveryLocation.lat, deliveryLocation.lng);
            // If distance is extremely small, use a minimum of 0.5km
            if (distanceKm < 0.1) distanceKm = 0.5;
            
            // Calculate using dynamic settings
            const baseFee = settings.deliveryFeeBase || 60;
            const perKmFee = settings.deliveryFeePerKm || 20;
            const maxFee = settings.deliveryFeeMax || 200;
            
            finalDeliveryFee = Math.min(maxFee, Math.round(baseFee + (distanceKm * perKmFee)));
        } else {
            // Fallback distance if location data is missing
            distanceKm = 1.5; // Reduced from 2.0 to be more realistic for unknown locations
            finalDeliveryFee = settings.deliveryFeeBase || 60;
        }

        const riderEarnings = calculateRiderEarning(distanceKm);
        const finalServiceFee = serviceFee || settings.serviceFee || 0;
        
        // Calculate tax based on dynamic settings
        const taxRate = settings.isTaxEnabled ? (settings.taxRate || 8) : 0;
        const finalTax = tax !== undefined ? tax : Math.round(subtotalValue * taxRate / 100);

        console.log('[Order] Creating order with data:', {
            user: req.user._id,
            restaurant,
            totalPrice: subtotalValue + finalDeliveryFee + finalServiceFee + finalTax,
            paymentMethod: paymentMethod || 'COD'
        });

        const order = await Order.create({
            user: req.user._id,
            restaurant,
            orderItems,
            shippingAddress,
            deliveryLocation: (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng) ? {
                lat: Number(deliveryLocation.lat),
                lng: Number(deliveryLocation.lng)
            } : null,
            paymentMethod: paymentMethod || 'COD',
            totalPrice: subtotalValue + finalDeliveryFee + finalServiceFee + finalTax, 
            subtotal: subtotalValue,
            deliveryFee: finalDeliveryFee,
            serviceFee: finalServiceFee,
            tax: finalTax,
            deliveryFeeCustomerPaid: finalDeliveryFee,
            distanceKm: distanceKm,
            riderEarning: riderEarnings.netEarning, // Added missing field
            grossRiderEarning: riderEarnings.grossEarning,
            netRiderEarning: riderEarnings.netEarning,
            platformFee: riderEarnings.platformFee,
            status: 'Pending',
            commissionPercent,
            commissionAmount,
            restaurantEarning,
            adminEarning: commissionAmount + finalServiceFee,
            orderAmount: subtotalValue,
            promoCode: promoCode || ''
        });

        // Save address to user profile if not already set or first order
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                // Check if this is their first order
                const orderCount = await Order.countDocuments({ user: user._id });
                
                // Save address if user has no address OR if this is their first order
                if (!user.address || user.address === '' || orderCount <= 1) {
                    user.address = deliveryAddress;
                    user.city = req.body.city || user.city || 'Pakistan';
                    
                    if (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng) {
                        user.location = {
                            lat: Number(deliveryLocation.lat),
                            lng: Number(deliveryLocation.lng)
                        };
                    }
                    
                    // Also update phone if provided and not set
                    if (req.body.phone && !user.phone) {
                        user.phone = req.body.phone;
                    }

                    await user.save();
                    console.log(`[User] Address and location auto-saved for user ${user._id} (Order count: ${orderCount})`);
                }
            }
        } catch (addrErr) {
            console.error('[User] Error auto-saving address:', addrErr);
        }

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
        triggerEvent('admin', 'stats_updated', { type: 'order_created', orderId: populatedOrder._id });
        
        // Detailed admin notification (Email + Socket)
        await notifyAdmins(
            'New Order Placed',
            `A new order #${populatedOrder._id.toString().slice(-5)} has been placed for Rs. ${populatedOrder.totalPrice}.`,
            'new_order',
            { orderId: populatedOrder._id, amount: populatedOrder.totalPrice }
        );

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
            subtotal: order.subtotal || (order.totalPrice - (order.deliveryFee || 0)),
            deliveryFee: order.deliveryFee,
            distanceKm: order.distanceKm,
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

        // Prevent status updates for already delivered or cancelled orders
        if (order.status === 'Delivered' || order.status === 'Cancelled') {
            return res.status(400).json({ message: `Order already ${order.status.toLowerCase()}` });
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
        if (order.user) {
            triggerEvent(`user-${order.user.toString()}`, 'orderStatusUpdate', updatedOrder);
        }

        // Notify restaurant about order update
        if (order.restaurant) {
            triggerEvent(`restaurant-${order.restaurant.toString()}`, 'orderStatusUpdate', updatedOrder);
        }

        // Always notify admin about any order status update
        triggerEvent('admin', 'order_updated', updatedOrder);
        triggerEvent('admin', 'stats_updated', { type: 'order_status_updated', orderId: updatedOrder._id });

        // When order is ready, notify all available riders
        if (status === 'Ready') {
            // Calculate potential earnings for riders
            let distance = updatedOrder.distanceKm || 0;
            if (distance === 0 && updatedOrder.restaurant?.location?.coordinates && updatedOrder.deliveryLocation?.lat) {
                const [restLng, restLat] = updatedOrder.restaurant.location.coordinates;
                distance = calculateDistance(restLat, restLng, updatedOrder.deliveryLocation.lat, updatedOrder.deliveryLocation.lng);
            }
            if (distance === 0) distance = 4.2; // Default fallback
            const earnings = calculateRiderEarning(distance);

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
                user: updatedOrder.user ? {
                    name: updatedOrder.user.name,
                    phone: updatedOrder.user.phone
                } : null,
                totalPrice: updatedOrder.totalPrice,
                subtotal: updatedOrder.subtotal,
                deliveryFee: updatedOrder.deliveryFee,
                paymentMethod: updatedOrder.paymentMethod,
                orderItems: updatedOrder.orderItems,
                createdAt: updatedOrder.createdAt,
                distance: distance,
                distanceKm: distance,
                earnings: earnings.netEarning,
                netRiderEarning: earnings.netEarning
            });
        }

        // Also notify specifically assigned rider if any
        if (order.rider) {
            triggerEvent(`rider-${order.rider.toString()}`, 'orderStatusUpdate', updatedOrder);
        }

        // Add special event for ArrivedAtCustomer status
        if (status === 'ArrivedAtCustomer' && order.user) {
            triggerEvent(`user-${order.user.toString()}`, 'riderArrived', {
                orderId: order._id,
                message: 'Your rider has arrived at your location!'
            });
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
const processOrderCompletion = async (order, distanceKm, req = null) => {
    try {
        console.log(`[Finance] Processing completion for Order: ${order._id}, Status: ${order.status}`);
        
        // IDEMPOTENCY CHECK: Don't process if already paid or delivered
        if (order.isPaid && order.riderEarning > 0) {
            console.log(`[Finance] Order ${order._id} already processed. Skipping...`);
            return;
        }
        
        // If distanceKm is not provided or 0, try to calculate it
        let finalDistance = distanceKm || order.distanceKm || 0;
        if ((!finalDistance || finalDistance === 0) && order.restaurant?.location?.coordinates && order.deliveryLocation?.lat) {
            const [restLng, restLat] = order.restaurant.location.coordinates;
            finalDistance = calculateDistance(restLat, restLng, order.deliveryLocation.lat, order.deliveryLocation.lng);
        }
        
        // Fallback if still 0 - reduced from 4.2 to 1.5 to prevent overpayment
        if (!finalDistance || finalDistance === 0) finalDistance = 1.5;

        if (!order.rider) {
            console.error(`[Finance] Order ${order._id} completion attempted without rider assigned.`);
            throw new Error('No rider assigned to this order. Please accept the order first.');
        }

        // Fetch Restaurant to check commission rate and business type
        const restaurant = await Restaurant.findById(order.restaurant);
        if (!restaurant) {
            console.error(`[Finance] Restaurant ${order.restaurant} not found for order ${order._id}`);
            throw new Error('Restaurant not found for finance split');
        }
        
        console.log(`[Finance] Restaurant: ${restaurant.name}, Business Type: ${restaurant.businessType}, Commission: ${restaurant.commissionRate}%`);

        // Use restaurant's specific commissionRate, fallback to business type defaults
        const commissionPercent = (restaurant.commissionRate !== undefined && restaurant.commissionRate !== null) 
            ? restaurant.commissionRate 
            : (restaurant.businessType === 'home-chef' ? 10 : 15);
        
        // 2. Calculate split payments
        const subtotal = order.subtotal || order.totalPrice || 0;
        const commissionAmount = (subtotal * commissionPercent) / 100;
        const restaurantEarning = subtotal - commissionAmount;
        
        // Rider Pay: Rs 60 Base + Rs 20/km
        const riderPayCalc = calculateRiderEarning(finalDistance);
        const riderEarning = riderPayCalc.netEarning;

        console.log(`[Finance] Split: Subtotal=${subtotal}, Commission=${commissionAmount}, RestEarning=${restaurantEarning}, RiderEarning=${riderEarning}`);
        
        // 3. Update order with detailed finance breakdown
        order.orderAmount = subtotal;
        order.commissionPercent = commissionPercent;
        order.commissionAmount = commissionAmount;
        order.restaurantEarning = restaurantEarning;
        order.riderEarning = riderEarning;
        order.grossRiderEarning = riderPayCalc.grossEarning;
        order.platformFee = 0;
        order.netRiderEarning = riderEarning;
        
        // Calculate Net Platform Profit for this order: Commission + (Delivery Fee - Rider Pay)
        const deliveryFee = order.deliveryFee || 0;
        const netProfit = commissionAmount + (deliveryFee - riderEarning);
        
        order.adminEarning = netProfit; 
        order.platformRevenue = netProfit;
        order.distanceKm = finalDistance;
        
        order.isPaid = true; 
        order.paidAt = new Date();
        order.completedAt = new Date();
        order.deliveredAt = new Date();

        // 4. Update Rider Wallet & Stats
        // Use the string version of rider ID for the query
        const riderIdStr = order.rider.toString();
        let rider = await Rider.findById(riderIdStr).populate('user');
        
        if (!rider) {
            // Try fallback finding by user ID just in case the order.rider stored the User ID instead of Rider ID
            console.warn(`[Finance] Rider profile not found by ID ${riderIdStr}, trying fallback search by User ID...`);
            rider = await Rider.findOne({ user: riderIdStr }).populate('user');
        }

        if (rider) {
            console.log(`[Finance] Updating Rider Wallet: ${rider.fullName} (${rider._id})`);
            
            // Use helper to handle date-based resets and update earnings
            rider = updateRiderEarningsWithReset(rider, riderEarning);
            
            // Stats updates
            if (!rider.stats) {
                rider.stats = { totalDeliveries: 0, completedDeliveries: 0, cancelledDeliveries: 0 };
            }
            
            // Robust check for COD (case-insensitive)
            const isCOD = order.paymentMethod && 
                         (order.paymentMethod.toUpperCase() === 'COD' || 
                          order.paymentMethod.toUpperCase() === 'CASH');
            
            if (isCOD) {
                rider.cod_balance = (rider.cod_balance || 0) + (order.totalPrice || 0);
                
                console.log(`[Finance] COD Order detected. Updating rider.cod_balance by ${order.totalPrice}. New balance: ${rider.cod_balance}`);
                
                // Check if COD balance exceeds limit (e.g., 20,000)
                if (rider.cod_balance > 20000) {
                    rider.settlementStatus = 'overdue';
                }

                // Create COD Ledger entry
                await CODLedger.create({
                    rider: rider._id,
                    order: order._id,
                    cod_collected: order.totalPrice || 0,
                    rider_earning: riderEarning,
                    admin_balance: (order.totalPrice || 0) - riderEarning,
                    status: 'pending'
                });
            } else {
                console.log(`[Finance] Prepaid Order (${order.paymentMethod}). No COD balance update needed.`);
            }

            rider.stats.completedDeliveries = (rider.stats.completedDeliveries || 0) + 1;
            rider.stats.totalDeliveries = (rider.stats.totalDeliveries || 0) + 1;
            
            // Mark current order as null since it's completed
            rider.currentOrder = null;
            
            await rider.save();

            // Update RiderWallet model
            let riderWallet = await RiderWallet.findOne({ rider: rider._id });
            if (!riderWallet) {
                console.log(`[Finance] Creating new RiderWallet for rider: ${rider._id}`);
                riderWallet = await RiderWallet.create({ 
                    rider: rider._id,
                    totalEarnings: 0,
                    availableWithdraw: 0,
                    cashCollected: 0
                });
            }
            riderWallet.totalEarnings = (riderWallet.totalEarnings || 0) + riderEarning;
            riderWallet.availableWithdraw = (riderWallet.availableWithdraw || 0) + riderEarning;
            
            if (isCOD) {
                riderWallet.cashCollected = (riderWallet.cashCollected || 0) + (order.totalPrice || 0);
            }
            await riderWallet.save();

            // Transaction for Rider
            await Transaction.create({
                entityType: 'rider',
                entityId: rider._id,
                entityModel: 'Rider',
                order: order._id,
                type: 'earning',
                amount: riderEarning,
                balanceAfter: rider.walletBalance,
                description: `Earning for order #${order.orderNumber || order._id.toString().slice(-6)} (Base 60 + ${finalDistance}km x 20)`,
                metadata: { distanceKm: finalDistance, basePay: 60, kmRate: 20 }
            });

            const riderUserId = rider.user?._id || rider.user;
            if (riderUserId) {
                const notification = await createNotification(
                    riderUserId,
                    'Payment Received',
                    `Rs. ${riderEarning.toLocaleString()} added to wallet`,
                    'payment',
                    { orderId: order._id, amount: riderEarning }
                );
                triggerEvent(`user-${riderUserId}`, 'notification', notification);
                triggerEvent(`rider-${rider._id}`, 'notification', notification);
            }
        } else {
            console.error(`[Finance] CRITICAL: Rider profile not found for order.rider value: ${riderIdStr}`);
            throw new Error('Rider profile not found. Payment cannot be processed.');
        }

        // 5. Update Restaurant Wallet & Stats
        let restaurantWallet = await RestaurantWallet.findOne({ restaurant: order.restaurant });
        if (!restaurantWallet) {
            restaurantWallet = await RestaurantWallet.create({ 
                restaurant: order.restaurant,
                availableBalance: 0,
                totalEarnings: 0,
                totalCommissionCollected: 0
            });
        }

        restaurantWallet.availableBalance = (restaurantWallet.availableBalance || 0) + restaurantEarning;
        restaurantWallet.totalEarnings = (restaurantWallet.totalEarnings || 0) + restaurantEarning;
        restaurantWallet.totalCommissionCollected = (restaurantWallet.totalCommissionCollected || 0) + commissionAmount;
        await restaurantWallet.save();

        // Notify admin about restaurant wallet/stats update
        triggerEvent('admin', 'restaurant_updated', { _id: order.restaurant });

        // Transaction for Restaurant
        await Transaction.create({
            entityType: 'restaurant',
            entityId: order.restaurant,
            entityModel: 'Restaurant',
            order: order._id,
            type: 'earning',
            amount: restaurantEarning,
            balanceAfter: restaurantWallet.availableBalance,
            description: `Order #${order.orderNumber}: Rs ${subtotal} - ${commissionPercent}% Commission`,
            metadata: { subtotal, commissionAmount, commissionPercent }
        });

        // 6. Transaction for Platform (Admin Profit)
        await Transaction.create({
            entityType: 'platform',
            entityId: order.restaurant,
            entityModel: 'Restaurant',
            order: order._id,
            type: 'commission',
            amount: commissionAmount,
            balanceAfter: 0,
            description: `Commission from #${order.orderNumber || order._id.toString().slice(-6)} (${restaurant.name})`
        });

    } catch (error) {
        console.error('CRITICAL: Process order completion error:', error);
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

// @desc    Rate rider for an order
// @route   POST /api/orders/:id/rate-rider
// @access  Private
const rateRider = async (req, res) => {
    try {
        const { rating, review } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to rate this order' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ message: 'Cannot rate rider until order is delivered' });
        }

        if (order.riderRating > 0) {
            return res.status(400).json({ message: 'You have already rated the rider for this order' });
        }

        order.riderRating = rating;
        order.riderReview = review || '';
        await order.save();

        if (order.rider) {
            const rider = await Rider.findById(order.rider);
            if (rider) {
                const totalRatings = rider.stats.rating * rider.stats.reviewCount;
                rider.stats.reviewCount += 1;
                rider.stats.rating = (totalRatings + rating) / rider.stats.reviewCount;
                await rider.save();

                // Notify rider about new rating
                const riderUserId = rider.user?._id || rider.user;
                if (riderUserId) {
                    const notification = await createNotification(
                        riderUserId,
                        'New Rating Received',
                        `A customer rated you ${rating} stars for order #${order.orderNumber || order._id.toString().slice(-6)}`,
                        'rating',
                        { orderId: order._id, rating }
                    );
                    triggerEvent(`user-${riderUserId}`, 'notification', notification);
                }
            }
        }

        res.json({ message: 'Rating submitted successfully', order });
    } catch (error) {
        console.error('Rate rider error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Complete order and process payments
// @route   POST /api/orders/:id/complete
// @access  Private (Rider/Admin)
const completeOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Order already delivered' });
        }

        // Security check: Ensure the user is the assigned rider or an admin
        if (req.user.role === 'rider') {
            const rider = await Rider.findOne({ user: req.user._id });
            if (!rider || (order.rider && order.rider.toString() !== rider._id.toString())) {
                console.error(`[Order] Unauthorized completion attempt. Rider: ${rider?._id}, Order Rider: ${order.rider}`);
                return res.status(403).json({ message: 'You are not authorized to complete this order. Only the assigned rider can mark it as delivered.' });
            }
            
            // If order.rider is somehow missing but the rider is authorized, fix it here
            if (!order.rider && rider) {
                console.warn(`[Order] Auto-assigning missing rider ${rider._id} to order ${order._id} during completion`);
                order.rider = rider._id;
                order.riderAcceptedAt = order.riderAcceptedAt || new Date();
                await order.save(); // Persist rider assignment before processing completion
            }
        }

        const { distanceKm } = req.body;
        console.log(`[Order] Completing order ${order._id}, distance: ${distanceKm}km`);

        // Process completion (finance splits, wallets, stats)
        // Use a default distance of 5km if none provided
        const finalDistance = distanceKm || order.distanceKm || 5;
        await processOrderCompletion(order, finalDistance);

        // Update status and save
        order.status = 'Delivered';
        order.deliveredAt = new Date();
        await order.save();

        // Get fully populated order to emit
        const updatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact location')
            .populate({
                path: 'rider',
                populate: { path: 'user', select: 'name phone' }
            });

        // Notify user
        const notification = await createNotification(
            order.user,
            'Order Delivered',
            `Your order #${order.orderNumber || order._id.toString().slice(-6)} has been delivered. Enjoy your meal!`,
            'order',
            { orderId: order._id }
        );
        
        if (order.user) {
            triggerEvent(`user-${order.user}`, 'notification', notification);
            triggerEvent(`user-${order.user}`, 'orderStatusUpdate', updatedOrder);
        }

        if (order.restaurant) {
            triggerEvent(`restaurant-${order.restaurant}`, 'orderStatusUpdate', updatedOrder);
        }

        if (order.rider) {
            triggerEvent(`rider-${order.rider}`, 'orderStatusUpdate', updatedOrder);
        }

        // Notify admin to refresh stats
        triggerEvent('admin', 'order_updated', updatedOrder);
        triggerEvent('admin', 'stats_updated', { type: 'order_delivered', orderId: updatedOrder._id });

        triggerEvent(`order-${order._id}`, 'statusUpdate', { status: 'Delivered', order: updatedOrder });

        res.json({ message: 'Order marked as delivered', order: updatedOrder });
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(error.message.includes('not found') || error.message.includes('No rider assigned') ? 400 : 500).json({ 
            message: error.message || 'Server error',
            error: error.message 
        });
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
        order.riderLocation = location;
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
    updateOrderLocation,
    rateRider
};

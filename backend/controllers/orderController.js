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
            promoCode,
            discount,
            cutlery
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
        if (!restaurant || !mongoose.Types.ObjectId.isValid(restaurant)) {
            console.error(`[Order] Invalid Restaurant ID: ${restaurant}`);
            return res.status(400).json({ message: 'Invalid Restaurant ID' });
        }

        const restaurantExists = await Restaurant.findById(restaurant);
        if (!restaurantExists) {
            console.error(`[Order] Restaurant not found: ${restaurant}`);
            return res.status(404).json({ message: 'Restaurant not registered or not found' });
        }

        if (restaurantExists.verificationStatus !== 'approved') {
            console.error(`[Order] Restaurant not approved: ${restaurantExists.name}`);
            return res.status(400).json({ message: 'Restaurant is not yet approved for orders' });
        }

        // Map frontend data to model schema with fallback for image
        const orderItems = await Promise.all(items.map(async (item, index) => {
            let itemImage = item.image;
            let dishId = item.dish || item._id || item.product;
            
            console.log(`[Order] Processing item ${index}: ${item.name}, ID: ${dishId}`);

            // Clean dishId if it has suffixes like -combo or -drink
            if (typeof dishId === 'string' && dishId.includes('-')) {
                dishId = dishId.split('-')[0];
            }

            // VALIDATION: Ensure dishId is a valid MongoDB ObjectId
            if (!dishId || !mongoose.Types.ObjectId.isValid(dishId)) {
                console.warn(`[Order] Invalid Dish ID for ${item.name}: ${dishId}. Attempting recovery...`);
                try {
                    const foundDish = await Dish.findOne({ name: item.name, restaurant: restaurantExists._id });
                    if (foundDish) {
                        dishId = foundDish._id;
                        console.log(`[Order] Recovered dishId ${dishId} for ${item.name}`);
                    }
                } catch (e) {
                    console.error(`[Order] Recovery failed for ${item.name}:`, e.message);
                }
            }

            if (!dishId || !mongoose.Types.ObjectId.isValid(dishId)) {
                console.error(`[Order] Critical: Could not find valid ID for item ${item.name}`);
                throw new Error(`Invalid product ID for item: ${item.name}`);
            }

            // If image is missing, try to fetch it from the Dish model
            if (!itemImage && dishId) {
                try {
                    const dish = await Dish.findById(dishId);
                    if (dish && dish.imageUrl) {
                        itemImage = dish.imageUrl;
                    }
                } catch (err) {
                    console.error(`[Order] Error fetching dish image for ${dishId}:`, err.message);
                }
            }

            return {
                name: item.name,
                qty: Math.max(1, Number(item.quantity || item.qty) || 1),
                image: itemImage || '', 
                price: Math.max(0, Number(item.price) || 0),
                variant: item.variant || null,
                drinks: item.drinks || [],
                product: dishId
            };
        }));

        const shippingAddress = {
            address: (deliveryAddress || 'No address provided').trim() + (deliveryInstructions ? ` (Note: ${deliveryInstructions})` : ''),
            city: req.body.city || 'Pakistan',
            postalCode: req.body.postalCode || '',
            country: 'Pakistan'
        };

        // Calculate commission and earnings early for display in dashboard
        const commissionPercent = (restaurantExists.commissionRate !== undefined && restaurantExists.commissionRate !== null) 
            ? Number(restaurantExists.commissionRate) 
            : (settings.commissionRate || (restaurantExists.businessType === 'home-chef' ? 10 : 15));
        
        const subtotalValue = Math.max(0, Number(subtotal) || (Number(totalAmount) - (Number(deliveryFee) || 0)) || 0);
        const commissionAmount = Math.round((subtotalValue * commissionPercent) / 100);
        const restaurantEarning = Math.max(0, subtotalValue - commissionAmount);

        // Calculate Distance and Rider Earnings on backend for accuracy
        let distanceKm = 0;
        let finalDeliveryFee = Math.max(0, Number(deliveryFee) || 0);

        if (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng && restaurantExists.location?.coordinates) {
            const [restLng, restLat] = restaurantExists.location.coordinates;
            distanceKm = calculateDistance(restLat, restLng, Number(deliveryLocation.lat), Number(deliveryLocation.lng));
            if (distanceKm < 0.1) distanceKm = 0.5;
            
            const baseFee = Number(settings.deliveryFeeBase) || 40;
            const perKmFee = Number(settings.deliveryFeePerKm) || 20;
            const maxFee = Number(settings.deliveryFeeMax) || 200;
            
            finalDeliveryFee = Math.min(maxFee, Math.round(baseFee + (distanceKm * perKmFee)));
        } else {
            distanceKm = 0;
            finalDeliveryFee = Number(settings.deliveryFeeBase) || 40;
        }

        const riderEarnings = calculateRiderEarning(distanceKm, settings);
        const finalServiceFee = Math.max(0, Number(serviceFee) || settings.serviceFee || 0);
        
        const taxRate = settings.isTaxEnabled ? (Number(settings.taxRate) || 8) : 0;
        const finalTax = Math.max(0, tax !== undefined ? Number(tax) : Math.round(subtotalValue * taxRate / 100));

        const calculatedTotalPrice = Math.max(0, subtotalValue + finalDeliveryFee + finalServiceFee + finalTax - (Number(discount) || 0));

        const isOnlinePayment = paymentMethod && 
                               typeof paymentMethod === 'string' && 
                               ['COD', 'CASH'].indexOf(paymentMethod.toUpperCase()) === -1;
        
        const gatewayFeeAmount = isOnlinePayment ? Math.round(subtotalValue * 0.025) : 0;

        console.log('[Order] Final Calculation:', {
            subtotal: subtotalValue,
            delivery: finalDeliveryFee,
            service: finalServiceFee,
            tax: finalTax,
            discount: Number(discount) || 0,
            total: calculatedTotalPrice,
            gatewayFee: gatewayFeeAmount
        });

        // Generate a simple order number if not provided
        const orderCount = await Order.countDocuments();
        const generatedOrderNumber = `FS-${Date.now().toString().slice(-4)}-${orderCount + 1}`;

        const order = await Order.create({
            user: req.user._id,
            restaurant: restaurantExists._id,
            orderItems,
            shippingAddress,
            deliveryLocation: (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng) ? {
                lat: Number(deliveryLocation.lat),
                lng: Number(deliveryLocation.lng)
            } : null,
            paymentMethod: paymentMethod || 'COD',
            totalPrice: calculatedTotalPrice, 
            subtotal: subtotalValue,
            deliveryFee: finalDeliveryFee,
            serviceFee: finalServiceFee,
            tax: finalTax,
            discount: Number(discount) || 0,
            deliveryFeeCustomerPaid: finalDeliveryFee,
            distanceKm: distanceKm,
            riderEarning: riderEarnings.netEarning,
            grossRiderEarning: riderEarnings.grossEarning,
            netRiderEarning: riderEarnings.netEarning,
            platformFee: riderEarnings.platformFee,
            status: 'Pending',
            commissionPercent,
            commissionAmount,
            restaurantEarning,
            gatewayFee: gatewayFeeAmount,
            adminEarning: commissionAmount + (finalDeliveryFee - riderEarnings.netEarning) + finalServiceFee + finalTax - gatewayFeeAmount - (Number(discount) || 0),
            orderAmount: subtotalValue,
            promoCode: promoCode || '',
            cutlery: !!cutlery,
            orderNumber: generatedOrderNumber
        });

        // Save address to user profile if not already set or first order
        try {
            const user = await User.findById(req.user._id);
            if (user) {
                const orderCount = await Order.countDocuments({ user: user._id });
                if (!user.address || user.address === '' || orderCount <= 1) {
                    user.address = deliveryAddress;
                    user.city = req.body.city || user.city || 'Pakistan';
                    
                    if (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng) {
                        user.location = {
                            lat: Number(deliveryLocation.lat),
                            lng: Number(deliveryLocation.lng)
                        };
                    }
                    
                    if (req.body.phone && !user.phone) {
                        user.phone = req.body.phone;
                    }

                    await user.save();
                    console.log(`[User] Profile updated for ${user._id}`);
                }
            }
        } catch (addrErr) {
            console.error('[User] Error auto-saving address:', addrErr.message);
        }

        // Auto-decrement stock for ordered items
        for (const item of orderItems) {
            if (item.product) {
                try {
                    const dish = await Dish.findById(item.product);
                    if (dish && dish.stockQuantity !== null) {
                        const newStock = dish.stockQuantity - item.qty;
                        dish.stockQuantity = Math.max(0, newStock);
                        await dish.save();
                    }
                } catch (stockErr) {
                    console.error(`[Stock] Error updating stock for ${item.product}:`, stockErr.message);
                }
            }
        }

        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('restaurant', 'name address contact');

        if (!populatedOrder) {
            throw new Error('Order created but failed to retrieve populated data');
        }

        // Emit Pusher events for real-time update
        triggerEvent(`restaurant-${restaurantExists._id.toString()}`, 'newOrder', populatedOrder);
        triggerEvent('riders', 'newOrderAvailable', populatedOrder);
        triggerEvent('admin', 'order_created', populatedOrder);
        triggerEvent('admin', 'stats_updated', { type: 'order_created', orderId: populatedOrder._id });
        
        notifyAdmins(
            'New Order Placed',
            `A new order #${populatedOrder._id.toString().slice(-5)} has been placed for Rs. ${populatedOrder.totalPrice}.`,
            'new_order',
            { orderId: populatedOrder._id, amount: populatedOrder.totalPrice }
        ).catch(err => console.error('[Order] Background notification error:', err.message));

        console.log(`✅ Order ${populatedOrder._id} created successfully`);
        res.status(201).json(populatedOrder);
    } catch (error) {
        console.error('❌ createOrder Error:', error);
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
            .populate('restaurant', 'name address contact logo location')
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

        // Check if user is authorized to see this order
        const orderUserId = order.user._id ? order.user._id.toString() : order.user.toString();
        const isOwner = orderUserId === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isRestaurant = req.user.role === 'restaurant' && order.restaurant?._id?.toString() === req.user.restaurantId?.toString();
        
        let isAuthorizedRider = false;
        if (req.user.role === 'rider') {
            // Find the rider associated with this user
            const rider = await Rider.findOne({ user: req.user._id });
            if (rider) {
                const riderIdStr = rider._id.toString();
                // Authorized if they are the assigned rider
                const assignedRiderId = order.rider?._id ? order.rider._id.toString() : (order.rider ? order.rider.toString() : null);
                const isAssignedRider = assignedRiderId === riderIdStr;
                
                // Or if the order is available for any rider (unassigned and in pickup-able status)
                // Expanded list of statuses to include all potential "available" states
                const availableStatuses = ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'OnTheWay', 'Arrived', 'Picked Up'];
                const isAvailableForRider = !order.rider && availableStatuses.includes(order.status);
                
                isAuthorizedRider = isAssignedRider || isAvailableForRider;
            }
        }

        if (!isOwner && !isAdmin && !isRestaurant && !isAuthorizedRider) {
            console.error(`[Order] Unauthorized access attempt to order ${order._id} by user ${req.user._id} (Role: ${req.user.role})`);
            return res.status(403).json({ message: 'Not authorized to view this order' });
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
            await processOrderCompletion(order, distanceKm || 0, req); // Pass req to access io
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

        // Notify assigned rider about order update
        if (order.rider) {
            triggerEvent(`rider-${order.rider.toString()}`, 'orderStatusUpdate', updatedOrder);
        }

        // When order status changes to something riders can pick up, notify all riders
        // ONLY if no rider is assigned yet
        if (['Accepted', 'Ready'].includes(status) && !order.rider) {
            triggerEvent('riders', 'newOrderAvailable', updatedOrder);
        }

        // Notify admin about any order status update
        triggerEvent('admin', 'order_updated', updatedOrder);
        triggerEvent('admin', 'stats_updated', { type: 'order_status_updated', orderId: updatedOrder._id });
        
        // Notify the specific order channel for anyone watching this order
        triggerEvent(`order-${order._id}`, 'orderStatusUpdate', updatedOrder);

        // When order is ready, notify all available riders if no rider is assigned
        if (status === 'Ready' && !order.rider) {
            // Calculate potential earnings for riders
            let distance = updatedOrder.distanceKm || 0;
            if (distance === 0 && updatedOrder.restaurant?.location?.coordinates && updatedOrder.deliveryLocation?.lat) {
                const [restLng, restLat] = updatedOrder.restaurant.location.coordinates;
                distance = calculateDistance(restLat, restLng, updatedOrder.deliveryLocation.lat, updatedOrder.deliveryLocation.lng);
            }
            // CONSISTENCY: Use 0 as fallback if distance is still not available
            if (!distance || distance < 0) distance = 0; 
            const earnings = calculateRiderEarning(distance, settings);

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
                netRiderEarning: earnings.netEarning,
                riderEarning: earnings.netEarning
            });
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

        const settings = await Settings.getSettings();
        
        // If distanceKm is not provided or 0, try to calculate it
        let finalDistance = distanceKm || order.distanceKm || 0;
        if ((!finalDistance || finalDistance === 0) && order.restaurant?.location?.coordinates && order.deliveryLocation?.lat) {
            const [restLng, restLat] = order.restaurant.location.coordinates;
            finalDistance = calculateDistance(restLat, restLng, order.deliveryLocation.lat, order.deliveryLocation.lng);
        }
        
        // CONSISTENCY: Use 0 as fallback if distance is still not available
        if (!finalDistance || finalDistance < 0) finalDistance = 0;

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
            ? Number(restaurant.commissionRate) 
            : (restaurant.businessType === 'home-chef' ? 10 : 15);
        
        // 2. Calculate split payments
        // Priority: Use saved values if they exist, otherwise recalculate
        const subtotal = Number(order.subtotal || order.orderAmount || order.totalPrice || 0);
        const commissionAmount = order.commissionAmount || Math.round((subtotal * commissionPercent) / 100);
        const restaurantEarning = order.restaurantEarning || Math.max(0, subtotal - commissionAmount);
        
        // Rider Pay: Uses dynamic settings from system
        const riderPayCalc = calculateRiderEarning(finalDistance, settings);
        const riderEarning = order.riderEarning || riderPayCalc.netEarning;

        console.log(`[Finance] Split: Subtotal=${subtotal}, Commission=${commissionAmount}, RestEarning=${restaurantEarning}, RiderEarning=${riderEarning}`);
        
        // 3. Update order with detailed finance breakdown
        order.orderAmount = subtotal;
        order.commissionPercent = commissionPercent;
        order.commissionAmount = commissionAmount;
        order.restaurantEarning = restaurantEarning;
        order.riderEarning = riderEarning;
        order.grossRiderEarning = order.grossRiderEarning || riderPayCalc.grossEarning;
        order.platformFee = order.platformFee || 0;
        order.netRiderEarning = riderEarning;
        
        // Calculate Net Platform Profit for this order: Commission + (Delivery Fee - Rider Pay) + Service Fee + Tax - Gateway Fee
        const deliveryFee = Number(order.deliveryFee || 0);
        const serviceFee = Number(order.serviceFee || 0);
        const tax = Number(order.tax || 0);
        
        // Gateway fee calculation - usually on total paid by customer
        const isOnlinePayment = order.paymentMethod && 
                               typeof order.paymentMethod === 'string' && 
                               ['COD', 'CASH'].indexOf(order.paymentMethod.toUpperCase()) === -1;
        
        const gatewayFee = order.gatewayFee || (isOnlinePayment ? Math.round(Number(order.totalPrice || 0) * 0.025) : 0);
        
        // Handle discounts - usually platform bears voucher costs in early stage
        const discount = Number(order.discount || 0);
        
        const netProfit = Math.round(commissionAmount + (deliveryFee - riderEarning) + serviceFee + tax - gatewayFee - discount);
        
        order.gatewayFee = gatewayFee;
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
            
            const codAmount = order.totalPrice || 0;
            
            if (isCOD) {
                rider.cod_balance = (rider.cod_balance || 0) + codAmount;
                
                console.log(`[Finance] COD Order detected. Updating rider.cod_balance by ${codAmount}. New balance: ${rider.cod_balance}`);
                
                // Check if COD balance exceeds limit (e.g., 20,000)
                if (rider.cod_balance > 20000) {
                    rider.settlementStatus = 'overdue';
                }

                // Create COD Ledger entry
                await CODLedger.create({
                    rider: rider._id,
                    order: order._id,
                    cod_collected: codAmount,
                    rider_earning: riderEarning,
                    admin_balance: codAmount - riderEarning,
                    status: 'pending'
                });
            } else {
                console.log(`[Finance] Prepaid Order (${order.paymentMethod}). No COD balance update needed.`);
            }

            rider.stats.completedDeliveries = (rider.stats.completedDeliveries || 0) + 1;
            rider.stats.totalDeliveries = (rider.stats.totalDeliveries || 0) + 1;
            
            // Update rider earnings and wallet balance
            rider.earnings.today = (rider.earnings.today || 0) + riderEarning;
            rider.earnings.thisWeek = (rider.earnings.thisWeek || 0) + riderEarning;
            rider.earnings.thisMonth = (rider.earnings.thisMonth || 0) + riderEarning;
            rider.earnings.total = (rider.earnings.total || 0) + riderEarning;
            rider.walletBalance = (rider.walletBalance || 0) + riderEarning;
            rider.earnings_balance = (rider.earnings_balance || 0) + riderEarning;
            
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
                riderWallet.cashCollected = (riderWallet.cashCollected || 0) + codAmount;
            }
            await riderWallet.save();

            // Real-time update for Rider Wallet
            triggerEvent(`rider-${rider._id}`, 'wallet_updated', {
                cod_balance: rider.cod_balance,
                earnings_balance: rider.earnings_balance,
                walletBalance: rider.walletBalance,
                earnings: rider.earnings,
                stats: rider.stats
            });

            // Real-time update for Admin COD Settlement
            triggerEvent('admin', 'cod_updated', {
                riderId: rider._id,
                cod_balance: rider.cod_balance,
                orderId: order._id
            });

            // Transaction for Rider
            await Transaction.create({
                entityType: 'rider',
                entityId: rider._id,
                entityModel: 'Rider',
                order: order._id,
                type: 'earning',
                amount: riderEarning,
                balanceAfter: rider.walletBalance,
                description: `Earning for order #${order.orderNumber || order._id.toString().slice(-6)}`,
                metadata: { 
                    distanceKm: finalDistance, 
                    basePay: settings.deliveryFeeBase || 40, 
                    kmRate: settings.deliveryFeePerKm || 20 
                }
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
        restaurantWallet.pendingPayout = (restaurantWallet.pendingPayout || 0) + restaurantEarning;
        restaurantWallet.totalEarnings = (restaurantWallet.totalEarnings || 0) + restaurantEarning;
        restaurantWallet.totalCommissionCollected = (restaurantWallet.totalCommissionCollected || 0) + commissionAmount;
        await restaurantWallet.save();

        // Notify restaurant about wallet update
        triggerEvent(`restaurant-${order.restaurant}`, 'wallet_updated', {
            availableBalance: restaurantWallet.availableBalance,
            totalEarnings: restaurantWallet.totalEarnings
        });

        // Notify admin about restaurant wallet/stats update
        triggerEvent('admin', 'restaurant_updated', { _id: order.restaurant });
        triggerEvent('admin', 'stats_updated', { 
            type: 'order_completed',
            orderId: order._id,
            adminEarning: order.adminEarning
        });

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
        let restaurant = await Restaurant.findOne({ owner: req.user._id });

        if (!restaurant) {
            console.log(`[Orders] No restaurant linked to ID ${req.user._id}. Searching by contact info...`);
            
            // SMART LINKING
            const userEmail = req.user.email?.toLowerCase();
            const userPhone = req.user.phone || req.user.phoneNumber;
            const normalizedUserPhone = userPhone ? userPhone.replace(/[\s\-\+\(\)]/g, '').slice(-10) : null;

            if (normalizedUserPhone) {
                restaurant = await Restaurant.findOne({ contact: new RegExp(normalizedUserPhone + '$') });
            }

            if (!restaurant && userEmail) {
                const allRests = await Restaurant.find({}).populate('owner');
                restaurant = allRests.find(r => r.owner?.email?.toLowerCase() === userEmail);
            }

            if (restaurant) {
                console.log(`[SmartLinking] Re-linking restaurant ${restaurant._id} to user ${req.user._id} for orders`);
                restaurant.owner = req.user._id;
                await restaurant.save();
            }
        }

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
        console.log(`[Rating] rateRider initiated for order ${req.params.id}`);
        const { rating, review } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Please provide a rating between 1 and 5' });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            console.error(`[Rating] Order not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            console.error(`[Rating] Unauthorized rating attempt. User: ${req.user._id}, Order User: ${order.user}`);
            return res.status(403).json({ message: 'Not authorized to rate this order' });
        }

        if (order.status !== 'Delivered') {
            console.warn(`[Rating] Attempted to rate non-delivered order ${order._id}. Status: ${order.status}`);
            return res.status(400).json({ message: 'Cannot rate rider until order is delivered' });
        }

        if (order.riderRating > 0) {
            console.warn(`[Rating] Order ${order._id} already rated`);
            return res.status(400).json({ message: 'You have already rated the rider for this order' });
        }

        order.riderRating = rating;
        order.riderReview = review || '';
        await order.save();
        console.log(`[Rating] Order ${order._id} rating saved: ${rating}`);

        if (order.rider) {
            const rider = await Rider.findById(order.rider);
            if (rider) {
                console.log(`[Rating] Updating stats for Rider ${rider._id} (${rider.fullName})`);
                
                // Initialize stats if missing
                if (!rider.stats) {
                    rider.stats = { rating: 0, reviewCount: 0, totalDeliveries: 0, completedDeliveries: 0, cancelledDeliveries: 0 };
                }
                
                const currentRating = Number(rider.stats.rating) || 0;
                const currentReviewCount = Number(rider.stats.reviewCount) || 0;
                
                const totalRatings = currentRating * currentReviewCount;
                rider.stats.reviewCount = currentReviewCount + 1;
                rider.stats.rating = Number(((totalRatings + Number(rating)) / rider.stats.reviewCount).toFixed(2));
                
                await rider.save();
                console.log(`[Rating] Rider ${rider._id} new rating: ${rider.stats.rating} (${rider.stats.reviewCount} reviews)`);

                // Notify rider about new rating
                try {
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
                } catch (notifyErr) {
                    console.error(`[Rating] Notification error: ${notifyErr.message}`);
                }
            } else {
                console.warn(`[Rating] Rider ${order.rider} profile not found during rating update`);
            }
        }

        res.json({ message: 'Rating submitted successfully', order });
    } catch (error) {
        console.error('❌ rateRider Error:', error);
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
        // Use a default distance of 0km if none provided
        const finalDistance = distanceKm || order.distanceKm || 0;
        await processOrderCompletion(order, finalDistance, req);

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

        triggerEvent(`order-${order._id}`, 'orderStatusUpdate', updatedOrder);

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

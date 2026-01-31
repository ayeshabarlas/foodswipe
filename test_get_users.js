const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        
        const role = 'customer';
        const users = await mongoose.connection.db.collection('users').aggregate([
            { $match: { role: role } },
            {
                $lookup: {
                    from: 'orders',
                    let: { userId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$user', '$$userId'] } } }
                    ],
                    as: 'orders'
                }
            },
            {
                $addFields: {
                    totalOrders: { $size: '$orders' },
                    totalSpent: {
                        $sum: {
                            $map: {
                                input: '$orders',
                                as: 'o',
                                in: { $convert: { input: { $ifNull: ['$$o.totalPrice', { $ifNull: ['$$o.totalAmount', 0] }] }, to: 'double', onError: 0, onNull: 0 } }
                            }
                        }
                    },
                    lastOrderDate: { $max: '$orders.createdAt' },
                    cancellations: {
                        $size: {
                            $filter: {
                                input: '$orders',
                                as: 'order',
                                cond: { $in: ['$$order.status', ['Cancelled', 'Rejected']] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    phone: 1,
                    role: 1,
                    createdAt: 1,
                    lastLogin: 1,
                    firebaseUid: 1,
                    totalOrders: 1,
                    totalSpent: 1,
                    lastOrderDate: 1,
                    cancellations: 1,
                    status: 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]).toArray();

        console.log('Customers found:', users.length);
        if (users.length > 0) {
            console.log('First customer sample:', users[0]);
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });

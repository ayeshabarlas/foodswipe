const users = require('./users');
const restaurants = require('./restaurants');
const dishes = require('./dishes');

// Initialize with seed data
let store = {
    users: [...users],
    restaurants: [...restaurants],
    dishes: [...dishes],
    orders: [],
    riders: [],
};

// Helper to simulate async DB calls
const mockDb = {
    users: {
        findOne: async (query) => {
            // Support queries like { email }, { phone }, and { $or: [{ email }, { phone }] } with optional role
            const matches = (u, q) => {
                const roleOk = q.role ? u.role === q.role : true;
                if (q.$or && Array.isArray(q.$or)) {
                    return roleOk && q.$or.some(cond => {
                        if (cond.email) return u.email === cond.email;
                        if (cond.phone) return u.phone === cond.phone;
                        if (cond.phoneNumber) return u.phone === cond.phoneNumber || u.phoneNumber === cond.phoneNumber;
                        return false;
                    });
                }
                if (q.email) return roleOk && u.email === q.email;
                if (q.phone) return roleOk && u.phone === q.phone;
                if (q.phoneNumber) return roleOk && (u.phone === q.phoneNumber || u.phoneNumber === q.phoneNumber);
                return false;
            };
            return store.users.find(u => matches(u, query));
        },
        findById: async (id) => store.users.find(u => u._id === id || u.id === id),
        create: async (data) => {
            const newUser = { ...data, _id: String(Date.now()) };
            store.users.push(newUser);
            return newUser;
        },
        matchPassword: async (user, password) => user.password === password, // Simple check for mock
    },
    restaurants: {
        find: async () => store.restaurants,
        findOne: async (query) => store.restaurants.find(r => r.name === query.name),
        create: async (data) => {
            const newRestaurant = { ...data, _id: String(Date.now()) };
            store.restaurants.push(newRestaurant);
            return newRestaurant;
        },
    },
    dishes: {
        find: async () => {
            // Populate restaurant
            return store.dishes.map(d => {
                const r = store.restaurants.find(rest => rest._id === d.restaurant || rest.id === d.restaurant);
                return { ...d, restaurant: r };
            });
        },
        findById: async (id) => {
            const d = store.dishes.find(dish => dish._id === id || dish.id === id);
            if (d) {
                const r = store.restaurants.find(rest => rest._id === d.restaurant || rest.id === d.restaurant);
                return { ...d, restaurant: r };
            }
            return null;
        },
        create: async (data) => {
            const newDish = { ...data, _id: String(Date.now()) };
            store.dishes.push(newDish);
            return newDish;
        },
    },
    orders: {
        find: async (query) => {
            if (query.restaurant) return store.orders.filter(o => o.restaurant === query.restaurant);
            if (query.user) return store.orders.filter(o => o.user === query.user);
            return store.orders;
        },
        findById: async (id) => store.orders.find(o => o._id === id),
        create: async (data) => {
            const newOrder = { ...data, _id: String(Date.now()), status: 'Pending' };
            store.orders.push(newOrder);
            return newOrder;
        },
        save: async (order) => {
            const index = store.orders.findIndex(o => o._id === order._id);
            if (index !== -1) store.orders[index] = order;
            return order;
        }
    }
};

module.exports = mockDb;

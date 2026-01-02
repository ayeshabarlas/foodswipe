const bcrypt = require('bcryptjs');

const users = [
    {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123', // Will be hashed by pre-save hook
        role: 'admin',
        phone: '1234567890',
    },
    {
        name: 'Ayesha Barlas',
        email: 'ayeshabarlas92@gmail.com',
        password: 'password123',
        role: 'admin',
        phone: '1234567891',
    },
    {
        name: 'Ayesha Barlas 636',
        email: 'ayeshabarlas636@gmail.com',
        password: 'password123',
        role: 'admin',
        phone: '1234567892',
    },
    {
        name: 'Restaurant Owner',
        email: 'restaurant@example.com',
        password: 'password123',
        role: 'restaurant',
        phone: '0987654321',
    },
    {
        name: 'Rider John',
        email: 'rider@example.com',
        password: 'password123',
        role: 'rider',
        phone: '1122334455',
    },
    {
        name: 'Jane Doe',
        email: 'customer@example.com',
        password: 'password123',
        role: 'customer',
        phone: '5566778899',
    },
];

module.exports = users;

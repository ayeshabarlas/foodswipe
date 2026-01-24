const mongoose = require('mongoose');

const dishSchema = mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Restaurant',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        ingredients: [
            {
                type: String,
            }
        ],
        price: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            default: 0, // Percentage or fixed amount, handled by logic
        },
        videoUrl: {
            type: String,
            default: '',
        },
        imageUrl: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: [true, 'Please specify a category'],
            default: 'Breakfast',
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        views: {
            type: Number,
            default: 0,
        },
        shares: {
            type: Number,
            default: 0,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        // Size Variants (Small, Medium, Large, etc.)
        variants: [
            {
                name: { type: String, required: true }, // e.g., "Small", "Medium", "Large"
                price: { type: Number, required: true },
                stock: { type: Number, default: null }, // null = unlimited
                isAvailable: { type: Boolean, default: true },
            }
        ],
        // Add-ons (Extra Cheese, Extra Sauce, etc.)
        addOns: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true },
                isAvailable: { type: Boolean, default: true },
            }
        ],
        // Drinks/Beverages
        drinks: [
            {
                name: { type: String, required: true },
                size: { type: String, default: '345ml' },
                price: { type: Number, required: true },
                isAvailable: { type: Boolean, default: true },
            }
        ],
        // Meal Combos
        combos: [
            {
                title: { type: String, required: true },
                items: [{ type: String }], // e.g., ["Burger", "Fries", "Drink"]
                price: { type: Number, required: true },
                isAvailable: { type: Boolean, default: true },
            }
        ],
        // Recommended Items (for cross-sell)
        recommendedItems: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Dish',
            }
        ],
        // Inventory Management
        stockQuantity: {
            type: Number,
            default: null, // null means unlimited/not tracking
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
        },
        rating: {
            type: Number,
            default: 0,
        },
        reviewCount: {
            type: Number,
            default: 0,
        },
        // Legacy customizations (keep for backward compatibility)
        customizations: [
            {
                name: { type: String, required: true },
                type: { type: String, enum: ['radio', 'checkbox', 'text'], default: 'radio' },
                required: { type: Boolean, default: false },
                maxSelections: { type: Number, default: 1 },
                options: [
                    {
                        name: { type: String, required: true },
                        price: { type: Number, default: 0 },
                        isAvailable: { type: Boolean, default: true },
                    }
                ],
            }
        ],
    },
    {
        timestamps: true,
    }
);

const Dish = mongoose.model('Dish', dishSchema);

module.exports = Dish;

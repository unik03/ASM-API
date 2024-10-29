const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    list_cart: { type: Array, required: true },
    user_id: { type: String, required: true },
    total: { type: Number, required: true },
    name_order: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String, required: true },
    delivery: { type: Number, default: 0 },
    status: { type: Number, default: 0 }, 
    accepted: { type: Boolean, default: false}, 
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

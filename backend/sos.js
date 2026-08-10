const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  userEmail: { type: String, default: null },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Handled'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('SOS', sosSchema);

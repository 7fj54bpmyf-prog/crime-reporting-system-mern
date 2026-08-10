const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, unique: true, required: true },
  userEmail: { type: String, default: null },
  anonymous: { type: Boolean, default: false },
  crimeType: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'In Progress', 'Resolved'],
    default: 'Submitted'
  }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);

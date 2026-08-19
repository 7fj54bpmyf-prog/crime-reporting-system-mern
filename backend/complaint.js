const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true
  },

  userEmail: {
    type: String,
    default: null
  },

  anonymous: {
    type: Boolean,
    default: false
  },

  crimeType: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  location: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: [
      'Submitted',
      'Under Review',
      'In Progress',
      'Resolved'
    ],
    default: 'Submitted'
  },

  assignedOfficer: {
    type: String,
    default: null
  },

  acceptedAt: {
    type: Date,
    default: null
  },

  investigationStatus: {
    type: String,
    enum: [
      'Not Started',
      'Accepted',
      'Investigating',
      'Completed'
    ],
    default: 'Not Started'
  },

  investigationUpdates: [{
    note: {
      type: String
    },

    officerEmail: {
      type: String
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  resolutionDetails: {
    type: String,
    default: ''
  },

  evidence: [{
    originalName: String,
    filename: String,
    path: String,
    uploadedBy: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Complaint', complaintSchema);
const mongoose = require('mongoose');

const shiftRequestSchema = new mongoose.Schema({
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    reviewedAt: {
        type: Date,
        required: false
    },
    adminNotes: {
        type: String,
        required: false
    },
    // Marker to identify as backdoor request
    isBackdoorRequest: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.ShiftRequest || mongoose.model('ShiftRequest', shiftRequestSchema);

const mongoose = require('mongoose');

const shiftsSchema = new mongoose.Schema({
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // Reference to the Department model
        required: true
    },
    shifts:[{
        date: {
            type: Date,
            required: true
        },
        startTime: {
            type: String, // e.g., "09:00 AM"
            required: true
        },
        endTime: {
            type: String, // e.g., "05:00 PM"
            required: true
        },
        quantity: {
            type: Number, // Number of staff required for this shift
            required: true
        },
        published: {
            type: Boolean, // Indicates if the shift is published
            required: true,
            default: false // Default to false if not specified     
        },
        status: [{
            status: {
                type: String,
                enum: ['available', 'pending', 'approved', 'rejected'],
                default: 'available',
            },
            by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false //can be empty when no user has picked it
            },
            isBackdoorRequest: {
                type: Boolean,
                default: false // Flag to identify shifts created from backdoor requests
            },
            bookedAt: {
                type: Date,
                default: Date.now
            },
            reviewedAt: {
                type: Date,
                required: false
            },
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Admin who reviewed the request
                required: false
            },
            rejectionReason: {
                type: String,
                required: false // Only used when status is 'rejected'
            }
        }],
        rejectionHistory: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            reason: {
                type: String,
                required: false
            },
            rejectedAt: {
                type: Date,
                default: Date.now
            },
            rejectedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Admin who rejected the request
                required: false
            }
        }],
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: false
    },
},
{
    timestamps: true // Automatically add createdAt and updatedAt fields})
});

module.exports = mongoose.models.shifts || mongoose.model('Shifts', shiftsSchema);
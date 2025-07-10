const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rules: [{
        type: String,
        required: false
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

module.exports = mongoose.models.department || mongoose.model('Department', departmentSchema);
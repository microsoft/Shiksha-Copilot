const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const limitRequestUserSchema = new Schema(
    {
        userRole: {
            type: String,
            required: [true, 'User role is required'],
            trim: true,
        },
        requestCounPerDay: {
            type: Number,
            required: [true, 'Request count per day is required'],
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
    },
    { 
        timestamps: true,
    }
);

const LimitRequestUser = mongoose.model('LimitRequestUser', limitRequestUserSchema);

module.exports = LimitRequestUser;

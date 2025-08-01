const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        sessionDate: {
            type: Date,
            required: true,
        },
        requestCount: {
            type: Number,
            default: 0,
        }
    },
    { 
        timestamps: true,
    }
);

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;

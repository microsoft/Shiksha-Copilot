const mongoose = require('mongoose');


const UserActivityLogsSchema = new mongoose.Schema({
    moduleName:{
        type:String,
        required:true
    },
    idleTime:{
        type:Number,
        required:true
    },
    interactionTime:{
        type:Number,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    draftId:{
        type:mongoose.Schema.Types.ObjectId
    },
    planId:{
        type:mongoose.Schema.Types.ObjectId
    },
    isCompleted:{
        type:Boolean
    }
},
{
    timestamps:true
})

const UserActivity = mongoose.model('UserActivity',UserActivityLogsSchema);

module.exports = UserActivity
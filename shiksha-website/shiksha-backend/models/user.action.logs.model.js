const mongoose = require('mongoose');


const userActionLogsSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    userName:{
        type:String
    },
    actionType:{
        type:String
    },
    deviceType:{
        type:String
    },
	browserInfo:{
        type:String
    },
	osInfo:{
        type:String
    },
    timestamp:{
        type:Date
    }
},
{
    timestamps:true
})

const UserAction = mongoose.model("UserAction", userActionLogsSchema);

module.exports = UserAction
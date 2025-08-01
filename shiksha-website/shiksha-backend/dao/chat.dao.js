const Chat = require('../models/chat.model.js');
const Message = require('../models/message.model.js');
const BaseDao = require('./base.dao.js');
const LessonChat = require("../models/lesson.chats.model.js");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class ChatDao extends BaseDao {
    constructor() {
        super(Chat);
    }

    async getActiveSession(userId,date) {
        try {
            return await Chat.findOne({
                userId: new ObjectId(userId),
                sessionDate: date
            })
        } catch (err) {
            throw new Error('Error retrieving active session: ' + err.message);
        }
    }

    async create(sessionData) {
        try {
            return await Chat.create(sessionData);
        } catch (err) {
            throw new Error(`Failed to create chat session: ${err.message}`);
        }
    }

    async createMessage(data) {
        try {
            const newMessage = await Message.create(data);
            return newMessage;
        } catch (err) {
            throw new Error('Error creating message: ' + err.message);
        }
    }

    async findById(id) {
        try {
            return await Chat.findById(id);
        } catch (err) {
            throw new Error(`Failed to find chat session by ID: ${err.message}`);
        }
    }

    async getMessages(chatHistoryId) {
        try {
            return await Message.find({ chatHistoryId }).sort({ createdAt: 1 });
        } catch (err) {
            throw new Error(`Failed to get messages for chat session: ${err.message}`);
        }
    }
    async addMessage(chatHistoryId, messageData) {
        try {
            return await Message.updateOne(
                { chatHistoryId },
                {
                    $push: {
                        messages: {
                            $each: [{
                                question: messageData.question,
                                answer: messageData.answer,
                                createdAt: new Date()
                            }],
                            $position: 0  
                        }
                    }
                }
            );
        } catch (err) {
            throw new Error('Error adding message: ' + err.message);
        }
    }

    async getMessagesBySessionId(chatHistoryId) {
        try {
            return await Message.findOne({chatHistoryId});
        } catch (err) {
            throw new Error(`Failed to get messages by date for chat session: ${err.message}`);
        }
    }

    async update(id, updates) {
        try {
            return await Chat.findByIdAndUpdate(id, updates, { new: true });
        } catch (err) {
            throw new Error(`Failed to update chat session: ${err.message}`);
        }
    }

    async getLessonMessages(recordId, userId, fromDate = null, toDate = null) {
        try {
            const query = {
                teacherId: new ObjectId(userId),  
                recordId
            };
    
            if (fromDate && toDate) {
                query.createdAt = { 
                    $gte: fromDate, 
                    $lte: toDate  
                };
            }
    
            const messages = await LessonChat.find(query).sort({ createdAt: -1 });
    
            return messages;
        } catch (err) {
            throw new Error(`Failed to get lesson messages: ${err.message}`);
        }
    }

    async getAllLessonMessages(userId, fromDate, toDate) {
        try {
            const query = {
                teacherId: new ObjectId(userId),  
                createdAt :{ 
                    $gte: fromDate, 
                    $lte: toDate  
                }
            };
    
            const messages = await LessonChat.find(query).sort({ createdAt: -1 });
    
            return messages;
        } catch (err) {
            throw new Error(`Failed to get lesson messages: ${err.message}`);
        }
    }

    async createLessonChats(data) {
        try {
            const newLessonChat = await LessonChat.create(data);
            return newLessonChat;
        } catch (err) {
            throw new Error(`Failed to create lesson chat: ${err.message}`);
        }
    }

}

module.exports = ChatDao;

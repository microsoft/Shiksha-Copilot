const handleError = require('../helper/handleError.js');
const ChatManager = require('../managers/chat.manager.js');
const BaseController = require('./base.controller.js');

class ChatController extends BaseController {
    constructor() {
        super(new ChatManager());
        this.chatManager = new ChatManager();
    }

    async sendMessage(req, res) {
        try {
            const { message } = req.body;
            const userId  = req.user._id;
            const result = await this.chatManager.sendMessage(userId, message);
            if (!result.success) {
                return res.status(404).json({ message: result.message, data:result.data });
            }
            return res.status(200).json({ message: result.message, data:result.data });
        } catch (err) {
            console.log('Error --> ChatController -> sendMessage()', err);
            return handleError(err, res);
        }
    }

    async listMessages(req, res) {
        try {
            const userId  = req.user._id;
            const result = await this.chatManager.listMessages(userId);
            if (!result.success) {
                return res.status(404).json({ message: result.message, data:result.data });
            }
            return res.status(200).json({ message: result.message, data:result.data });
        } catch (err) {
            console.log('Error --> ChatController -> listMessages()', err);
            return handleError(err, res);
        }
    }

    async sendLessonMessage(req, res) {
        try {
            const { recordId , chapterId } = req.params;
            const userId = req.user._id;
            const { message } = req.body;
            const result = await this.chatManager.sendLessonMessage(userId, recordId, chapterId , message);
            if (!result.success) {
                return res.status(404).json({ message: result.message, data: result.data });
            }
            return res.status(200).json({ message: result.message, data: result.data });
        } catch (err) {
            console.log('Error --> LessonChatController -> sendLessonMessage()', err);
            return handleError(err, res);
        }
    }

    async listLessonMessages(req, res) {
        try {
            const { recordId , chapterId } = req.params;
            const userId = req.user._id;
            const result = await this.chatManager.listLessonMessages(recordId,chapterId ,userId);
            if (!result.success) {
                return res.status(404).json({ message: result.message, data: result.data });
            }
            return res.status(200).json({ message: result.message, data: result.data });
        } catch (err) {
            console.log('Error --> LessonChatController -> listLessonMessages()', err);
            return handleError(err, res);
        }
    }
}

module.exports = ChatController;

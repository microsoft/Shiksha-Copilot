const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/asyncMiddleware.js');
const ChatController = require('../controllers/chat.controller.js');
const chatController = new ChatController();
const { isAuthenticated } = require("../middlewares/auth.js");


router.post(
    '/chat/message',
    isAuthenticated,
    asyncMiddleware(chatController.sendMessage.bind(chatController))
);

router.get(
    '/chat/messages',
    isAuthenticated,
    asyncMiddleware(chatController.listMessages.bind(chatController))
);

router.post(
    '/lessonchat/message/:recordId/:chapterId',
    isAuthenticated,
    asyncMiddleware(chatController.sendLessonMessage.bind(chatController))
);

router.get(
    '/lessonchat/messages/:recordId/:chapterId',
    isAuthenticated,
    asyncMiddleware(chatController.listLessonMessages.bind(chatController))
);


module.exports = router;

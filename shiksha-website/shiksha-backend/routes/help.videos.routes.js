const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const HelpVideosController = require("../controllers/help.videos.controller.js");
const { isAuthenticated, isAdmin } = require("../middlewares/auth.js");
const helpVideosController = new HelpVideosController();

router.post(
    "/help-videos/create",
    isAuthenticated,
    isAdmin,
    asyncMiddleware(helpVideosController.create.bind(helpVideosController))
);

router.post(
    "/help-videos/bulk-create",
    isAuthenticated,
    isAdmin,
    asyncMiddleware(helpVideosController.bulkUploadHelpVideos.bind(helpVideosController))
);

router.get(
    "/help-videos/list",
    asyncMiddleware(helpVideosController.getAllHelpVideos.bind(helpVideosController))
);

router.delete(
    "/help-videos/:id",
    isAuthenticated,
    isAdmin,
    asyncMiddleware(helpVideosController.delete.bind(helpVideosController))
);

module.exports = router;

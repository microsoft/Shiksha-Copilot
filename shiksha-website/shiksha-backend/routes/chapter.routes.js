const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const ChapterController = require("../controllers/chapter.controller.js");
const MulterUploadMiddleware = require("../middlewares/multerUploadMiddleware.js");
const { isAuthenticated, isAdmin } = require("../middlewares/auth.js");


const chapterController = new ChapterController();

router.get(
	"/chapter/list",
	asyncMiddleware(chapterController.getAll.bind(chapterController))
);

router.get(
	"/chapter/get-by-sem",
	asyncMiddleware(chapterController.getBySemester.bind(chapterController))
);

router.get(
	"/chapter/:id",
	asyncMiddleware(chapterController.getById.bind(chapterController))
);

router.put(
	"/chapter/:id",
	asyncMiddleware(chapterController.update.bind(chapterController))
);

router.post(
	"/chapter/create",
	asyncMiddleware(chapterController.create.bind(chapterController))
);

router.delete(
	"/chapter/:id",
	asyncMiddleware(chapterController.delete.bind(chapterController))
);

router.post(
	"/chapter/script-from-lp",
	isAuthenticated,
	isAdmin,
	MulterUploadMiddleware,
	asyncMiddleware(chapterController.scriptFromLp.bind(chapterController))
);

router.post(
	"/chapter/update",
	isAuthenticated,
	isAdmin,
	MulterUploadMiddleware,
	asyncMiddleware(chapterController.updateChapter.bind(chapterController))
)

module.exports = router;

const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const { isAuthenticated ,isAdmin} = require("../middlewares/auth.js");
const MasterLessonController = require("../controllers/master.lesson.controller.js");
const {
	validateMasterLessonCreate,
} = require("../validations/master.lesson.validation.js");
const MulterUploadMiddleware = require("../middlewares/multerUploadMiddleware.js");


const masterLessonController = new MasterLessonController();

router.post(
	"/master-lesson/create",
	validateMasterLessonCreate,
	asyncMiddleware(masterLessonController.create.bind(masterLessonController))
);

router.get(
	"/master-lesson/list",
	isAuthenticated,
	asyncMiddleware(masterLessonController.getAll.bind(masterLessonController))
);

router.post(
	"/lesson-plan/save-to-teacher",
	isAuthenticated,
	asyncMiddleware(
		masterLessonController.saveToTeacher.bind(masterLessonController)
	)
);

router.post(
	"/lesson-plan/get-by-teacher",
	isAuthenticated,
	asyncMiddleware(
		masterLessonController.getByTeacher.bind(masterLessonController)
	)
);

router.get(
	"/master-lesson/activity/:id",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(
		masterLessonController.getActivityById.bind(masterLessonController)
	)
);

router.post(
	"/lesson-plan/regenerate",
	isAuthenticated,
	asyncMiddleware(
		masterLessonController.regenerateLessonPlan.bind(masterLessonController)
	)
);

router.post(
	"/lesson-plan/combo",
	asyncMiddleware(
		masterLessonController.comboScript.bind(masterLessonController)
	)
);

router.get(
	"/master-lesson/list/:chapterId",
	asyncMiddleware(
		masterLessonController.getLessonOutcomes.bind(masterLessonController)
	)
);

router.get(
	"/master-lesson/:lessonId",
	isAuthenticated,
	asyncMiddleware(
		masterLessonController.generateLessonPlan.bind(masterLessonController)
	)
);

router.post(
    "/webhook/lesson-plan/update",
    asyncMiddleware(
        masterLessonController.updateLessonPlan.bind(masterLessonController)
    )
);

router.get(
	"/master-lesson/lesson/tables/:lessonId",
	isAuthenticated,
	asyncMiddleware(
		masterLessonController.get5ETables.bind(
			masterLessonController
		)
	)
);

router.post(
	"/master-lesson-and-resource/script-lp-dump",
	isAuthenticated,
	isAdmin,
	MulterUploadMiddleware,
	asyncMiddleware(
		masterLessonController.scriptLpDump.bind(masterLessonController)
	)
);

module.exports = router;

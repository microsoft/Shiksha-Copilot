const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const TeacherLessonPlanController = require("../controllers/teacher.lesson.plan.controller.js");
const { isAuthenticated } = require("../middlewares/auth.js");
const {
	validateTeacherLessonPlan,
} = require("../validations/teacher.lesson.plan.validation.js");

const teacherLessonPlanController = new TeacherLessonPlanController();

router.get(
	"/teacher-lesson-plan/list",
	isAuthenticated,
	validateTeacherLessonPlan,
	asyncMiddleware(
		teacherLessonPlanController.getByTeacherAndPagination.bind(
			teacherLessonPlanController
		)
	)
);

router.get(
	"/teacher-lesson-plan/monthly-count",
	isAuthenticated,
	asyncMiddleware(
		teacherLessonPlanController.getMonthlyCount.bind(
			teacherLessonPlanController
		)
	)
);

router.get(
    "/teacher-lesson-plan/regeneration-limit",
    isAuthenticated,
    asyncMiddleware(
        teacherLessonPlanController.getRegenerationLimit.bind(
            teacherLessonPlanController
        )
    )
);

router.post(
    "/teacher-lesson-plan/generate",
    isAuthenticated,
    asyncMiddleware(
        teacherLessonPlanController.generateContent.bind(
            teacherLessonPlanController
        )
    )
);

router.post(
    "/teacher-lesson-plan/regenerate",
    isAuthenticated,
    asyncMiddleware(
        teacherLessonPlanController.regenerateContent.bind(
            teacherLessonPlanController
        )
    )
);

router.post(
	"/teacher-lesson-plan/retry",
	isAuthenticated,
	asyncMiddleware(
		teacherLessonPlanController.retryLessonPlan.bind(
			teacherLessonPlanController
		)
	)
);

router.post(
    "/teacher-lesson-plan/webhook",
    asyncMiddleware(
        teacherLessonPlanController.handleWebhook.bind(
            teacherLessonPlanController
        )
    )
);

router.get(
	"/teacher-lesson-plan/exists/:lessonPlanId",
	isAuthenticated,
	asyncMiddleware(
		teacherLessonPlanController.checkIfLessonPlanExists.bind(
			teacherLessonPlanController
		)
	)
);


router.get(
	"/teacher-lesson-plan/lesson/:lessonPlanId",
	isAuthenticated,
	asyncMiddleware(
		teacherLessonPlanController.getLessonPlanById.bind(
			teacherLessonPlanController
		)
	)
);

router.get(
	"/teacher-lesson-plan/resource/:resourcePlanId",
	isAuthenticated,
	asyncMiddleware(
		teacherLessonPlanController.getResourcePlanById.bind(
			teacherLessonPlanController
		)
	)
);


module.exports = router;

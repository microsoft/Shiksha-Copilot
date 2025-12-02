const LessonPlanTemplateController = require("../controllers/lesson.plan.template.controller");
const asyncMiddleware = require("../middlewares/asyncMiddleware");
const { isAuthenticated ,isAdmin} = require("../middlewares/auth.js");

const router = require("express").Router();
const lessonPlanController = new LessonPlanTemplateController();

router.post(
  "/lesson-plan-template/create",
  isAuthenticated,
	isAdmin,
  asyncMiddleware(lessonPlanController.create.bind(lessonPlanController))
);

router.get(
  "/lesson-plan-template/list",
  asyncMiddleware(lessonPlanController.findTemplates.bind(lessonPlanController))
);

router.get(
  "/lesson-plan-template/:id",
  asyncMiddleware(lessonPlanController.getById.bind(lessonPlanController))
);
module.exports = router;

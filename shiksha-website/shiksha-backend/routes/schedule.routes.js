const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const ScheduleController = require("../controllers/schedule.controller.js");
const {
	validateScheduleCreate,
	validateScheduleUpdate,
} = require("../validations/schedule.validation.js");
const { isAuthenticated } = require("../middlewares/auth.js");

const scheduleController = new ScheduleController();

router.post(
	"/schedule/create",
	isAuthenticated,
	validateScheduleCreate,
	asyncMiddleware(scheduleController.create.bind(scheduleController))
);

router.get(
	"/schedule/list",
	asyncMiddleware(scheduleController.getAll.bind(scheduleController))
);

router.get(
	"/schedule/get-by-school",
	isAuthenticated,
	asyncMiddleware(scheduleController.getBySchool.bind(scheduleController))
);

router.get(
	"/schedule/my-schedules",
	isAuthenticated,
	asyncMiddleware(scheduleController.getMySchedules.bind(scheduleController))
);

router.get(
	"/schedule/:id",
	asyncMiddleware(scheduleController.getById.bind(scheduleController))
);

router.put(
	"/schedule/update",
	validateScheduleUpdate,
	isAuthenticated,
	asyncMiddleware(scheduleController.update.bind(scheduleController))
);

router.delete(
	"/schedule/:id/:timeId",
	isAuthenticated,
	asyncMiddleware(scheduleController.delete.bind(scheduleController))
);

module.exports = router;

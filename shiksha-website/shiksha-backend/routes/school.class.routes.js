const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const { isAuthenticated } = require("../middlewares/auth.js");
const ClassController = require("../controllers/school.class.controller.js");
const {
	validateClassCreate,
	validateClassGetById,
	validateClassUpdate,
	validateGroupClassByBoard,
} = require("../validations/school.class.validation.js");

const classController = new ClassController();

router.post(
	"/class/create",
	validateClassCreate,
	asyncMiddleware(classController.create.bind(classController))
);

router.get(
	"/class/list",
	asyncMiddleware(classController.getAll.bind(classController))
);

router.get(
	"/class/group-by-board/:schoolId",
	validateGroupClassByBoard,
	asyncMiddleware(classController.getGroupClassesByBoard.bind(classController))
);

router.get(
	"/class/:id",
	validateClassGetById,
	asyncMiddleware(classController.getById.bind(classController))
);

router.put(
	"/class/:id",
	validateClassUpdate,
	asyncMiddleware(classController.update.bind(classController))
);

router.delete(
	"/class/:id",
	asyncMiddleware(classController.delete.bind(classController))
);

module.exports = router;

const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const { isAuthenticated } = require("../middlewares/auth.js");
const SubjectController = require("../controllers/subject.controller.js");
const {
	validateSubjectCreate,
	validateSubjectGetById,
	validateSubjectUpdate,
} = require("../validations/subject.validation.js");

const subjectController = new SubjectController();

router.post(
	"/subject/create",
	validateSubjectCreate,
	asyncMiddleware(subjectController.create.bind(subjectController))
);

router.get(
	"/subject/list",
	asyncMiddleware(subjectController.getAll.bind(subjectController))
);

router.get(
	"/subject/:id",
	validateSubjectGetById,
	asyncMiddleware(subjectController.getById.bind(subjectController))
);

router.put(
	"/subject/update/:id",
	validateSubjectUpdate,
	asyncMiddleware(subjectController.update.bind(subjectController))
);

router.delete(
	"/subject/:id",
	asyncMiddleware(subjectController.delete.bind(subjectController))
);

module.exports = router;

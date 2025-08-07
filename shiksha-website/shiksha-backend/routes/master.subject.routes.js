const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const MasterSubjectController = require("../controllers/master.subject.controller.js");
const {
	validateMasterSubject,
} = require("../validations/master.subject.validation.js");
const { isAuthenticated } = require("../middlewares/auth.js");

const masterSubjectController = new MasterSubjectController();

router.post(
	"/master-subject/create",
	validateMasterSubject,
	asyncMiddleware(masterSubjectController.create.bind(masterSubjectController))
);

router.get(
	"/master-subject/list",
	asyncMiddleware(masterSubjectController.getAll.bind(masterSubjectController))
);

router.post(
	"/master-subject/get-by-name",
	isAuthenticated,
	asyncMiddleware(
		masterSubjectController.getByName.bind(masterSubjectController)
	)
);

router.get(
	"/master-subject/get-by-board/:board",
	asyncMiddleware(
		masterSubjectController.getByBoard.bind(masterSubjectController)
	)
);

router.get(
	"/master-subject/:id",
	asyncMiddleware(masterSubjectController.getById.bind(masterSubjectController))
);

router.put(
	"/master-subject/update",
	validateMasterSubject,
	asyncMiddleware(masterSubjectController.update.bind(masterSubjectController))
);

router.delete(
	"/master-subject/:id",
	asyncMiddleware(masterSubjectController.delete.bind(masterSubjectController))
);

module.exports = router;

const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const SchoolController = require("../controllers/school.controller.js");
const { validateSchool } = require("../validations/school.validation.js");
const uploadMiddleware = require("../middlewares/uploadMiddleware.js");
const schoolController = new SchoolController();
const { isAuthenticated, isAdmin } = require("../middlewares/auth.js");

router.post(
	"/school/create",
	validateSchool,
	asyncMiddleware(schoolController.create.bind(schoolController))
);

router.get(
	"/school/list",
	asyncMiddleware(schoolController.getAll.bind(schoolController))
);

router.get(
	"/school/export",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(schoolController.export.bind(schoolController))
);

router.get(
	"/school/:id",
	asyncMiddleware(schoolController.getById.bind(schoolController))
);

router.put(
	"/school/update/:id",
	validateSchool,
	asyncMiddleware(schoolController.update.bind(schoolController))
);

router.put(
	"/school/activate/:id",
	asyncMiddleware(schoolController.activate.bind(schoolController))
);

router.put(
	"/school/deactivate/:id",
	asyncMiddleware(schoolController.deactivate.bind(schoolController))
);

router.put(
	"/school/facility/:id",
	asyncMiddleware(schoolController.updateFacility.bind(schoolController))
);

router.delete(
	"/school/:id",
	asyncMiddleware(schoolController.delete.bind(schoolController))
);

router.post(
  "/school/bulk-upload",
  isAuthenticated, isAdmin,
  uploadMiddleware,
  asyncMiddleware(schoolController.bulkUpload.bind(schoolController))
);

module.exports = router;

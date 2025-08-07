const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const { isAuthenticated } = require("../middlewares/auth.js");
const MasterResourceController = require("../controllers/master.resource.controller.js");
const {
	validateMasterResource,
} = require("../validations/master.resource.validation.js");

const masterResourceController = new MasterResourceController();

router.post(
	"/resource-plan/create",
	validateMasterResource,
	asyncMiddleware(
		masterResourceController.create.bind(masterResourceController)
	)
);

router.get(
	"/resource-plan/list",
	asyncMiddleware(
		masterResourceController.getAll.bind(masterResourceController)
	)
);

router.put(
	"/resource-plan/update/:id",
	validateMasterResource,
	asyncMiddleware(
		masterResourceController.update.bind(masterResourceController)
	)
);

router.post(
	"/resource-plan/regenerate",
	isAuthenticated,
	asyncMiddleware(
		masterResourceController.regenerate.bind(masterResourceController)
	)
);

router.post(
	"/resource-plan/combo",
	asyncMiddleware(
		masterResourceController.comboScript.bind(masterResourceController)
	)
);

router.get(
	"/resource-plan/list/:chapterId",
	isAuthenticated,
	asyncMiddleware(
		masterResourceController.getSubtopicResourceList.bind(
			masterResourceController
		)
	)
);

router.get(
	"/master-resource/:resourceId",
	isAuthenticated,
	asyncMiddleware(
		masterResourceController.generateResourcePlan.bind(masterResourceController)
	)
);

module.exports = router;

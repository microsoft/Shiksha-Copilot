const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const { isAuthenticated, isAdmin } = require("../middlewares/auth.js");
const uploadMiddleware = require("../middlewares/uploadMiddleware.js");
const AdminUserController = require("../controllers/admin.user.controller.js");
const {
	validateAdminUserCreate,
	validateAdminUserGetById,
	validateAdminUserUpdate,
} = require("../validations/admin.user.validation.js");

const adminUserController = new AdminUserController();

router.post(
	"/admin/create",
	isAuthenticated,
	isAdmin,
	validateAdminUserCreate,
	asyncMiddleware(adminUserController.create.bind(adminUserController))
);

router.get(
	"/admin/dashboard",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(
		adminUserController.getDashboardMetrics.bind(adminUserController)
	)
);
router.get(
	"/admin/list",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(adminUserController.getAll.bind(adminUserController))
);

router.get(
	"/admin/get-content-activity",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(
		adminUserController.getContentActivity.bind(adminUserController)
	)
);

router.get(
	"/admin/content-activity/export",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(adminUserController.exportContentActivity.bind(adminUserController))
);

router.get(
	"/admin/:id",
	isAuthenticated,
	isAdmin,
	validateAdminUserGetById,
	asyncMiddleware(adminUserController.getById.bind(adminUserController))
);

router.put(
	"/admin/update",
	isAuthenticated,
	isAdmin,
	validateAdminUserUpdate,
	asyncMiddleware(adminUserController.update.bind(adminUserController))
);

router.delete(
	"/admin/:id",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(adminUserController.delete.bind(adminUserController))
);

router.post(
	"/admin/bulk-upload",
	isAuthenticated,
	isAdmin,
	uploadMiddleware,
	asyncMiddleware(adminUserController.bulkUpload.bind(adminUserController))
);
module.exports = router;

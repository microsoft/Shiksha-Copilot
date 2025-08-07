const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const { isAuthenticated ,isAdmin } = require("../middlewares/auth.js");
const uploadMiddleware = require("../middlewares/uploadMiddleware.js");
const UserController = require("../controllers/user.controller.js");
const {
	validateUserCreate,
	validateUserUpdate,
	validateUserGetByPhone,
	validateSetProfile,
	validatePreferredLanguageUpdate,
	validateUserActivityLog,
} = require("../validations/user.validation.js");

const userController = new UserController();

router.post(
	"/user/create",
	isAuthenticated,
	isAdmin,
	validateUserCreate,
	asyncMiddleware(userController.create.bind(userController))
);

router.post(
	"/user/get-by-phone",
	validateUserGetByPhone,
	asyncMiddleware(userController.getByPhone.bind(userController))
);

router.put(
	"/user/set-profile",
	validateSetProfile,
	isAuthenticated,
	asyncMiddleware(userController.setProfile.bind(userController))
);

router.patch(
	"/user/update-language",
	isAuthenticated,
	validatePreferredLanguageUpdate,
	asyncMiddleware(userController.updatePreferredLanguage.bind(userController))
);

router.get(
	"/user/list",
	asyncMiddleware(userController.getAll.bind(userController))
);

router.get(
	"/user/export",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(userController.export.bind(userController))
);

router.get(
	"/user/get-profile/:id",
	asyncMiddleware(userController.getProfile.bind(userController))
);

router.put(
	"/user/:id",
	isAuthenticated,
	isAdmin,
	validateUserUpdate,
	asyncMiddleware(userController.update.bind(userController))
);

router.get(
	"/user/:id",
	asyncMiddleware(userController.getUserWithSchoolId.bind(userController))
);

router.delete(
	"/user/:id",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(userController.delete.bind(userController))
);

router.post(
	"/user/bulk-upload",
	isAuthenticated,
	isAdmin,
	uploadMiddleware,
	asyncMiddleware(userController.bulkUpload.bind(userController))
);

router.post(
	"/user/upload-profile-image",
	isAuthenticated,
	uploadMiddleware,
	asyncMiddleware(userController.uploadProfileImage.bind(userController))
);

router.post(
	"/user/remove-profile-image",
	isAuthenticated,
	asyncMiddleware(userController.removeProfileImage.bind(userController))
);

router.put(
	"/user/activate/:id",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(userController.activate.bind(userController))
);

router.put(
	"/user/deactivate/:id",
	isAuthenticated,
	isAdmin,
	asyncMiddleware(userController.deactivate.bind(userController))
);

router.post(
	"/user/activity-log",
	validateUserActivityLog,
	isAuthenticated,
	asyncMiddleware(userController.activityLog.bind(userController))
);

module.exports = router;

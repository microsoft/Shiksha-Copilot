const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const AuthController = require("../controllers/auth.controller.js");
const {
	validateLogin,
	validateOtp,
	validateGetOtp
} = require("../validations/auth.validation.js");
const { isAuthenticated } = require("../middlewares/auth.js");

const authController = new AuthController();

router.post(
	"/auth/get-otp",
	validateGetOtp,
	asyncMiddleware(authController.getOtp.bind(authController))
);

router.post(
	"/auth/validate-otp",
	validateOtp,
	asyncMiddleware(authController.validateOtp.bind(authController))
);

router.get(
	"/auth/me",
	isAuthenticated,
	asyncMiddleware(authController.getUserFromToken.bind(authController))
);

module.exports = router;

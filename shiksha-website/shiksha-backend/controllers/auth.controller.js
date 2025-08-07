const handleError = require("../helper/handleError");
const AuthManager = require("../managers/auth.manager");

class AuthController {
	constructor() {
		this.authManager = new AuthManager();
	}

	async getOtp(req, res) {
		try {
			let result = await this.authManager.getOtp(req);
			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> AuthController -> getOtp()", err);
			return res.status(400).json(err);
		}
	}

	async validateOtp(req, res) {
		try {
			let result = await this.authManager.validateOtp(req);
			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> AuthController -> validateOtp()", err);
			return res.status(400).json(err);
		}
	}

	async getUserFromToken(req, res) {
		try {
			if (!req.user) {
				return res
					.status(401)
					.json({ success: false, messaage: "Token Expired!", data: null });
			}

			let result = await this.authManager.getUserFromToken(req);
			if (result.success) {
				return res.status(200).json(result);
			}

			return;
		} catch (err) {
			console.log("Error --> AuthController -> getUserFromToken()", err);
			return res.status(400).json(err);
		}
	}
}

module.exports = AuthController;

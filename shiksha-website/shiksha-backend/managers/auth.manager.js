require("dotenv").config();
const UserDao = require("../dao/user.dao");
const formatApiReponse = require("../helper/response");
const authHelper = require("../helper/auth.helper");
const AdminUserDao = require("../dao/admin.user.dao");
const {
	getPreSignedProfileImageUrl,
} = require("../services/azure.blob.service");
const CryptoJS = require('crypto-js');
const UserAction = require("../models/user.action.logs.model");
class AuthManager {
	constructor() {
		this.userDao = new UserDao();
		this.adminUserDao = new AdminUserDao();
	}

	async getUserByPhoneAndType(phone, type) {
		if (type === "0") {
			return this.userDao.getByPhone(phone);
		} else if (type === "1") {
			return this.adminUserDao.getByPhone(phone);
		} else {
			throw new Error("Invalid type");
		}
	}

	async updateUserByType(userId, type, updates) {
		if (type === "0") {
			await this.userDao.update(userId, updates);
		} else if (type === "1") {
			await this.adminUserDao.update(userId, updates);
		} else {
			throw new Error("Invalid type");
		}
	}

	async getOtp(req) {
		try {
			let { phone, rememberMe, forgotPassword } = req.body;
			let { type } = req.query; 
	
			const user = await this.getUserByPhoneAndType(phone, type);
			if (!user) {
				return formatApiReponse(false, "Account does not exist!", {});
			}
	
			if (user.isDeleted) {
				return formatApiReponse(false, "User is inactive", {});
			}

			let otpTriggered = false;

			if (forgotPassword || (!user.otp && !user.rememberMeToken)) {

				if (user.otp && forgotPassword) {
					const decryptedOtpBytes = CryptoJS.AES.decrypt(user.otp, process.env.PIN_SECRET_KEY);
					const decryptedOtp = decryptedOtpBytes.toString(CryptoJS.enc.Utf8);
		
					const templateId = process.env.VARIFORM_SMS_TEMPLATE;
					await authHelper.sendOtp(templateId, phone, decryptedOtp);
					otpTriggered = true;
				}
				else
				{
				const otp = authHelper.getOtp();
				const templateId = process.env.VARIFORM_SMS_TEMPLATE;
				await authHelper.sendOtp(templateId, phone, otp);
				const encryptedOtp = CryptoJS.AES.encrypt(otp, process.env.PIN_SECRET_KEY).toString();
				await this.updateUserByType(user._id, type, { otp: encryptedOtp, rememberMeToken: rememberMe === true });
				otpTriggered = true;
				}
			} else {
				await this.updateUserByType(user._id, type, { rememberMeToken: rememberMe === true });
			}

			const userObj = user.toObject();
			delete userObj.otp;
			delete userObj.rememberMeToken;
			return formatApiReponse(true, otpTriggered ? "OTP sent successfully" : "Verify your Pin!", { user:user.phone, otpTriggered });
	
		} catch (err) {
			return formatApiReponse(false, err?.message || "Internal Server Error", err);
		}
	}
	
	async validateOtp(req) {
		try {
			let { type } = req.query;
			let { phone, otp } = req.body;
			const user = await this.getUserByPhoneAndType(phone, type);
	
			if (!user) {
				return formatApiReponse(false, "Account does not exist!", null);
			}
	
			if (user.isDeleted) {
				return formatApiReponse(false, "User is inactive", {});
			}
	
			const { otp: encryptedOtp } = user;
			if (!encryptedOtp) {
				return formatApiReponse(false, "PIN not found", null);
			}
	
			const decryptedOtpBytes = CryptoJS.AES.decrypt(encryptedOtp, process.env.PIN_SECRET_KEY);
			const decryptedOtp = decryptedOtpBytes.toString(CryptoJS.enc.Utf8);
			let isOtpValid = otp === decryptedOtp;
			
			if (isOtpValid) {
				const token = user.generateAuthToken();
				await this.updateUserByType(user._id, type, { isLoginAllowed: true });
				const userObj = user.toObject();
				const agent = req.useragent;
				const deviceType = agent.isMobile ? 'mobile' :
                     agent.isTablet ? 'tablet' : 'desktop';
			    const browserInfo = `${agent.browser}/${agent.version}`;
				const osInfo = req.useragent.os;

				const userActionLogData = {
					userId:user._id,
					userName:user.name,
					actionType:'login',
					timestamp: new Date().toISOString(),
					deviceType,
					browserInfo,
					osInfo
				}

				await UserAction.create(userActionLogData)

				delete userObj.otp;
				delete userObj.rememberMeToken;
				return formatApiReponse(true, "PIN verified successfully!", { user: userObj, token });
			}
	
			return formatApiReponse(false, "Invalid PIN", null);
	
		} catch (err) {
			return formatApiReponse(false, err?.message || "Internal Server Error", err);
		}
	}

	async getUserFromToken(req) {
		try {
			let currentEpoch = parseInt(Date.now() / 1000);
			let imageUrl = "";
			let user;

			if (
				req.user.profileImage &&
				req.user.profileImageExpiresIn <= currentEpoch
			) {
				imageUrl = await getPreSignedProfileImageUrl(req.user._id);
				let expireLimit = 5 * 24 * 60 * 60;

				user = await this.userDao.update(req.user._id, {
					profileImage: imageUrl,
					profileImageExpiresIn: Number(currentEpoch) + Number(expireLimit),
				});

				req.user.profileImage = user.profileImage;
				req.user.profileImageExpiresIn = user.profileImageExpiresIn;
			}

			return { success: true, data: req.user, message: "" };
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = AuthManager;

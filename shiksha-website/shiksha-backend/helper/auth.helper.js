require("dotenv").config();
const crypto = require('crypto');
const variforrmSMSService = require('../services/variform.service'); 
class AuthHelper {
	getOtp() {
        const OTP = crypto.randomInt(1000, 10000).toString();
		return OTP;
	}

	async sendOtp(templateId, recipientPhone, pin) {
        try {
            const response = await variforrmSMSService(templateId, recipientPhone, pin);
            return response;
        } catch (error) {
            console.error("Error sending OTP via Variforrm service:", error.message);
            throw error;
        }
    }

	validateOtp(clientOtp, serverOtp) {
        return clientOtp === serverOtp;
    }
}

const authHelper = new AuthHelper();

module.exports = authHelper;

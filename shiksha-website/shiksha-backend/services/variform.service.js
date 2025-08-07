const axios = require("axios");
require("dotenv").config();

async function variforrmSMSService(templateId, recipientPhone, data) {
	const bearerToken = process.env.VARIFORM_BEARER_TOKEN;
	const smsUrl = process.env.VARIFORM_SMS_URL;
	const formattedRecipientPhone = `91${recipientPhone}`;
	const payload = {
		sender: process.env.VARIFORM_SENDER_ID,
		to: formattedRecipientPhone,
		templateId: templateId,
		custom:[data],
		type: process.env.VARIFORM_SMS_TYPE
	  }

	const config = {
		headers: {
			apikey: bearerToken,
			"Content-Type": "application/json",
		},
	};

	try {
		const response = await axios.post(
			`${smsUrl}/v1/sms/template`,
			payload,
			config
		);

		return response.data;
	} catch (error) {
		if (error.response) {
			console.error("Error sending SMS via Variforrm:", error.response.data);
		} else if (error.request) {
			console.error("No response received from Variforrm:", error.request);
		} else {
			console.error("Error setting up SMS request:", error.message);
		}
		throw new Error('Something went wrong!');
	}
}

module.exports = variforrmSMSService;

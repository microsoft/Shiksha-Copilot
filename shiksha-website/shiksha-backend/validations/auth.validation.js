const Joi = require("joi");


const validateGetOtp = (req, res, next) => {
    const data = req.body;

    const schema = Joi.object({
        phone: Joi.string().required(),
        rememberMe: Joi.boolean(),
        forgotPassword: Joi.boolean()
    });

    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: error.details.map((i) => i.message),
        });
    }

    next();
};

const validateOtp = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		phone: Joi.string().required(),
		otp: Joi.string(),
		rememberMe: Joi.boolean(),
	});

	let isValid = schema.validate(data, { abortEarly: false });

	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
		});
	}

	next();
};

module.exports = {
	validateOtp,
	validateGetOtp
};

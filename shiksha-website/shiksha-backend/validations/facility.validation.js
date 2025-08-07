const Joi = require("joi");

const createSchema = Joi.object({
	subject: Joi.string().required(),
	type: Joi.string().required(),
	facilities: Joi.array().items(Joi.string()).required(),
});

const updateSchema = Joi.object({
	_id: Joi.string().required(),
	subject: Joi.string().required(),
	type: Joi.string().required(),
	facilities: Joi.array().items(Joi.string()).required(),
});

const validateFacility = (req, res, next) => {
	const data = req.body;

	let isValid;

	if (req.originalUrl.includes("create")) {
		isValid = createSchema.validate(data, { abortEarly: false });
	}

	if (req.originalUrl.includes("update")) {
		isValid = updateSchema.validate(data, { abortEarly: false });
	}

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
	validateFacility,
};

const Joi = require("joi");

const baseBoardSchema = Joi.object({
	boardName: Joi.string().required(),
	state: Joi.string().required(),
	abbreviation: Joi.string().required()
});

const validateBoardCreate = (req, res, next) => {
	const data = req.body;

	let schema = baseBoardSchema;

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

const validateBoardUpdate = (req, res, next) => {
	const data = req.body;

	let updateSchema = baseBoardSchema.keys({
		id: Joi.string().required(),
	});

	let isValid = updateSchema.validate(data, { abortEarly: false });

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
	validateBoardCreate,
	validateBoardUpdate,
};
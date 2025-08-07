const Joi = require("joi");

const validateSubjectCreate = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		subject: Joi.string().required(),
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

const validateSubjectGetById = (req, res, next) => {
	const { id } = req.params;

	const schema = Joi.string().required();

	const { error } = schema.validate(id);

	if (error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: error.details.map((i) => i.message),
		});
	}
	next();
};

const validateSubjectUpdate = (req, res, next) => {
	const { id } = req.params;
	const data = req.body;


	if (!id) {
		return res.status(400).json({
			success: false,
			data: false,
			error: "ID parameter is required",
		});
	}

	const schema = Joi.object({
		subject: Joi.string().required(),
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

module.exports = {
	validateSubjectCreate,
	validateSubjectGetById,
	validateSubjectUpdate,
};

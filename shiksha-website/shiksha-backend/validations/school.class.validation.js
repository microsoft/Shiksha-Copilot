const Joi = require("joi");

const validateClassCreate = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		standard: Joi.number().required(),
		section: Joi.string().required(),
		subjects: Joi.array().items(
			Joi.object({
				subject: Joi.string().required(),
				topics: Joi.array().items(Joi.string()),
			})
		),
		girls_strength: Joi.number().required(),
		boys_strength: Joi.number().required(),
		total_strength: Joi.number().required(),
		school_id: Joi.string().required(),
		medium: Joi.string().required(),
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

const validateClassGetById = (req, res, next) => {
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

const validateClassUpdate = (req, res, next) => {
	const { id } = req.params;
	const data = req.body;

	const schema = Joi.object({
		standard: Joi.number(),
		section: Joi.string(),
		subjects: Joi.array().items(
			Joi.object({
				subject: Joi.string().required(),
				topics: Joi.array().items(Joi.string()),
			})
		),
		girls_strength: Joi.number(),
		boys_strength: Joi.number(),
		total_strength: Joi.number(),
		school_id: Joi.string(),
	});

	const { error } = schema.validate(data, { abortEarly: false });

	if (error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: error.details.map((i) => i.message),
		});
	}

	if (!id) {
		return res.status(400).json({
			success: false,
			data: false,
			error: "ID parameter is required",
		});
	}

	next();
};

const validateGroupClassByBoard = (req, res, next) => {
	const { schoolId } = req.params;

	if (!schoolId) {
		return res.status(400).json({
			success: false,
			data: false,
			error: "Disecode parameter is required",
		});
	}

	next();
};

const classSchema = Joi.object({
	schoolId: Joi.number().required(),
	board: Joi.string().required(),
	medium: Joi.string().required(),
	standard: Joi.number().required(),
	boys: Joi.number().integer().required(),
	girls: Joi.number().integer().required(),
});

module.exports = {
	validateClassCreate,
	validateClassGetById,
	validateClassUpdate,
	validateGroupClassByBoard,
	classSchema
};

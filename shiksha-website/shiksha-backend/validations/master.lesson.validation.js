const Joi = require("joi");

const validateMasterLessonCreate = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		name: Joi.string().min(3).required(),
		class: Joi.number().required(),
		board: Joi.string().required(),
		medium: Joi.string().required(),
		semester: Joi.number().optional(),
		subject: Joi.string().required(),
		chapterId: Joi.string().required(),
		teachingModel: Joi.string().optional(),
		subTopics: Joi.array().items(Joi.string()),
		level: Joi.array().items(Joi.string()).required(),
		instructionSet: Joi.array().items(Joi.object()).required(),
		learningOutcomes: Joi.array(),
		videos: Joi.array(),
		documents: Joi.array(),
		interactOutput: Joi.array(),
		extractedResources: Joi.array().required(),
		isAll: Joi.boolean().required(),
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
	validateMasterLessonCreate,
};

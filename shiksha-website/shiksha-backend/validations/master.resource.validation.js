const Joi = require("joi");
const validateRequest = require("./common.validation");

const schema = Joi.object({
	lessonName: Joi.string().required(),
	medium: Joi.string().required(),
	class: Joi.number().required(),
	board: Joi.string().required(),
	levels: Joi.string().required(),
	subject: Joi.string().required(),
	semester: Joi.string().required(),
	chapterId: Joi.string().required(),
	subTopics: Joi.array().items(Joi.string()),
	resources: Joi.array().required(),
	additionalResources: Joi.array().optional(),
	learningOutcomes: Joi.array(),
	isAll: Joi.boolean(),
});

const validateMasterResource = validateRequest(schema);

module.exports = {
	validateMasterResource,
	schema,
};

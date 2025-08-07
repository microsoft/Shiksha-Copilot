const Joi = require("joi");
const validateRequest = require("./common.validation");
const schema = Joi.object({
	teacherId: Joi.string().optional(),
	lessonId: Joi.string(),
	assessment: Joi.array(),
	feedback: Joi.string().optional(),
	feedbackPerSets: Joi.array().optional(),
	overallFeedbackReason: Joi.string().allow(""),
	isCompleted: Joi.boolean().required(),
});

const validateFeedbackLesson = validateRequest(schema);

module.exports = {
	validateFeedbackLesson,
	schema,
};

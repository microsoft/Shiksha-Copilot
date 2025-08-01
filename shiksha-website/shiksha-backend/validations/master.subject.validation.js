const Joi = require("joi");
const validateRequest = require("./common.validation");

const schema = Joi.object({
	subjectName: Joi.string().min(3).required(),
	code: Joi.string().required(),
	boards: Joi.array().items(Joi.string().required()).required(),
	isDeleted: Joi.boolean(),
	created_at: Joi.date(),
	updated_at: Joi.date(),
});

const validateMasterSubject = validateRequest(schema);

module.exports = {
	validateMasterSubject,
	schema,
};

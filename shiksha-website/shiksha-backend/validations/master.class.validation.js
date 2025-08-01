const Joi = require("joi");
const validateRequest = require("./common.validation");
const schema = Joi.object({
	standard: Joi.number().required(),
	medium: Joi.string().required(),
	isDeleted: Joi.boolean(),
	createdAt: Joi.date(),
	updatedAt: Joi.date(),
});

const validateMasterClass = validateRequest(schema);

module.exports = {
	validateMasterClass,
	schema,
};

const Joi = require("joi");

const roleValidator = (value, helpers) => {
	if (typeof value === "string") {
		return value.split("|").map((role) => role.trim());
	} else if (Array.isArray(value)) {
		// Validate each role in the array
		for (let role of value) {
			if (!["manager", "admin"].includes(role)) {
				return helpers.error('any.invalid');
			}
		}
		return value;
	}
	return helpers.error('any.invalid');
};
const shape = {
	name: Joi.string().required(),
	email: Joi.string().email().required(),
	phone: Joi.string().required(),
	password: Joi.string().min(8),
	role: Joi.custom(roleValidator, "role validator").required().messages({
		'any.invalid': 'Role must be either "admin" or "manager"',
		'any.required': 'Role is required'
	}),
	address: Joi.string().optional(),
	isDeleted: Joi.boolean().optional(),
	state: Joi.string().when('role', { is: Joi.array().has(Joi.string().valid('manager')), then: Joi.required(), otherwise: Joi.optional() }),
	zones: Joi.array().items(Joi.string()).when('role', { is: Joi.array().has(Joi.string().valid('manager')), then: Joi.required(), otherwise: Joi.optional() }),
	districts: Joi.array().items(Joi.string()).when('role', { is: Joi.array().has(Joi.string().valid('manager')), then: Joi.required(), otherwise: Joi.optional() }),
};

const adminUserSchemaCreate = Joi.object({
	...shape,
});

const adminUserSchemaUpdate = Joi.object({
	...shape,
	_id: Joi.string().required(),
});

const validateAdminUserCreate = (req, res, next) => {
	const data = req.body;

	let isValid = adminUserSchemaCreate.validate(data, { abortEarly: false });

	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
			message: "Validation failed"
		});
	}
	next();
};

const validateAdminUserGetById = (req, res, next) => {
	const data = { id: req?.params?.id };

	const adminUserSchemaId = Joi.object({
		id: Joi.string().required(),
	});
	let isValid = adminUserSchemaId.validate(data);
	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
		});
	}
	next();
};

const validateAdminUserUpdate = (req, res, next) => {
	const data = req.body;

	let isValid = adminUserSchemaUpdate.validate(data, { abortEarly: false });

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
	adminUserSchemaCreate,
	validateAdminUserCreate,
	validateAdminUserGetById,
	validateAdminUserUpdate,
};

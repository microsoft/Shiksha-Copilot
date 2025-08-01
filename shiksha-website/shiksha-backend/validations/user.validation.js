const Joi = require("joi");

const roleValidator = (value, helpers) => {
	if (typeof value === "string") {
		return value.split("|").map((role) => role.trim());
	}
	return value;
};

const phoneNumberPattern = /^[6789]\d{9}$/;

const userSchema = Joi.object({
	name: Joi.string().required(),
	profileImage: Joi.string().optional(),
	email: Joi.string().email(),
	zone: Joi.string().required(),
	state: Joi.string().required(),
	district: Joi.string().required(),
	block: Joi.string().required(),
	phone: Joi.string().required(),
	password: Joi.string().min(8),
	subjects: Joi.number(),
	address: Joi.string().optional(),
	role: Joi.custom(roleValidator, "role validator").required(),
	school: Joi.string().required(),
	preferredLanguage: Joi.string(),
	classes: Joi.array(),
	isDeleted: Joi.boolean().optional(),
});

const bulkUploadSchema = Joi.object({
	name: Joi.string()
    .min(5)
    .required()
    .messages({
      'string.base': 'Name should be a text.',
      'string.min': 'Name must be at least 5 characters long.',
      'any.required': 'Name is required.',
    }),
	phone: Joi.string()
    .pattern(phoneNumberPattern, 'Indian phone number')
    .required()
    .messages({
      'string.base': 'Phone number should be a text.',
      'string.pattern.name': 'Phone number must be a valid Indian phone number.',
      'any.required': 'Phone number is required.',
    }),
	school: Joi.number().required(),
	role: Joi.custom(roleValidator, "role validator").required(),
})

const validatePreferredLanguageUpdate = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		preferredLanguage: Joi.string().required(),
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

const validateUserCreate = (req, res, next) => {
	const data = req.body;

	let isValid = userSchema.validate(data, { abortEarly: false });

	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
		});
	}
	next();
};

const validateUserGetById = (req, res, next) => {
	const data = { id: req?.params?.id };

	const userSchemaId = Joi.object({
		id: Joi.string().required(),
	});
	let isValid = userSchemaId.validate(data);
	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
		});
	}
	next();
};

const validateUserGetByPhone = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		phone: Joi.string().required(),
	});
	let isValid = schema.validate(data);
	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
		});
	}
	next();
};

const validateUserUpdate = (req, res, next) => {
	const data = req.body;

	const schema = Joi.object({
		name: Joi.string(),
		phone: Joi.string(),
		state: Joi.string(),
		zone: Joi.string(),
		district: Joi.string(),
		block: Joi.string(),
		school: Joi.string(),
		role: Joi.custom(roleValidator, "role validator"),
		isSchoolChanged: Joi.boolean().optional(),
	}).min(1);

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

const classSchema = Joi.object({
	class: Joi.number().required(),
	board: Joi.string().required(),
	medium: Joi.string().required(),
	section: Joi.string().optional(),
	subject: Joi.string().required(),
	sem: Joi.number().required(),
	name: Joi.string().required(),
});

const profileSchema = Joi.object({
	preferredLanguage: Joi.string(),
	classes: Joi.array().items(classSchema),
	facilities: Joi.array().items(),
});

const validateSetProfile = (req, res, next) => {
	const data = req.body;

	const { error } = profileSchema.validate(data, { abortEarly: false });

	if (error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: error.details.map((i) => i.message),
		});
	}
	next();
};

const validateUserActivityLog = (req,res,next)=>{
	const data = req.body;
	const schema = Joi.object({
		moduleName:Joi.string().required(),
		idleTime:Joi.number().required(),
		interactionTime:Joi.number().required(),
		draftId:Joi.string().optional(),
		planId:Joi.string().optional(),
		isCompleted:Joi.boolean().optional(),
	})

	const {error} = schema.validate(data);

	if(error){
		return res.status(400).json({
			success: false,
			data: false,
			error: error.details.map((i) => i.message),
		});
	}
	next()
}

module.exports = {
	userSchema,
	bulkUploadSchema,
	validateUserCreate,
	validateUserGetById,
	validateUserGetByPhone,
	validateUserUpdate,
	validateSetProfile,
	validatePreferredLanguageUpdate,
	validateUserActivityLog
};

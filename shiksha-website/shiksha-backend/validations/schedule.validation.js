const Joi = require("joi");

const shape = {
	teacherId: Joi.string().required(),
	subject: Joi.string().required(),
	scheduleType: Joi.string().required(),
	isDeleted: Joi.boolean(),
	class: Joi.number().required(),
	board: Joi.string().required(),
	medium: Joi.string().required(),
	section: Joi.string().optional(),
	lessonId: Joi.string().required(),
	topic: Joi.string(),
	schoolId: Joi.string(),
	subTopic: Joi.string(),
	otherClass: Joi.string().allow(""),
	scheduleDateTime: Joi.array()
		.items({
			date: Joi.date(),
			fromTime: Joi.string(),
			toTime: Joi.string(),
		})
		.required(),
};

const scheduleSchemaCreate = Joi.object({
	...shape,
});

const scheduleSchemaUpdate = Joi.object({
	...shape,
	_id: Joi.string().required(),
});

const validateScheduleCreate = (req, res, next) => {
	const data = req.body;

	let isValid = scheduleSchemaCreate.validate(data, { abortEarly: false });

	if (isValid.error) {
		return res.status(400).json({
			success: false,
			data: false,
			error: isValid.error.details.map((i) => i.message),
		});
	}
	next();
};

const validateScheduleUpdate = (req, res, next) => {
	const data = req.body;

	let isValid = scheduleSchemaUpdate.validate(data, { abortEarly: false });

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
	validateScheduleCreate,
	validateScheduleUpdate,
};

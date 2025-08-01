const Joi = require("joi");
const validateRequest = require("./common.validation");
const { validateIsoDate } = require("../helper/filter.helper");

const schema = Joi.object({
  _id: Joi.string(),
  name: Joi.string().min(5).required(),
  schoolId: Joi.number()
  .integer()
  .min(10000000000) 
  .max(99999999999)
  .required()
  .messages({
    "number.base": "DiseCode must be an 11-digit number.",
    "number.min": "DiseCode must be an 11-digit number.",
    "number.max": "DiseCode must be an 11-digit number.",
    "any.required": "DiseCode is required.",
  }),
  website: Joi.string().optional(),
  type: Joi.string().optional(),
  boards: Joi.array().items(Joi.string()).required(),
  state: Joi.string().required(),
  zone: Joi.string().required(),
  district: Joi.string().required(),
  block: Joi.string().required(),
  playground: Joi.boolean(),
  mediums: Joi.array().items(Joi.string()).required(),
  academicYearStartDate: Joi.date(),
  academicYearEndDate: Joi.date(),
  holidayList: Joi.array()
    .items(
      Joi.object({
        date: Joi.date().optional(),
        reason: Joi.string().optional(),
      })
    )
    .optional(),
  isDeleted: Joi.boolean(),
  facilities: Joi.array().optional(),

  classes: Joi.array().items(
    Joi.object({
      _id: Joi.string(),
      medium: Joi.string().required(),
      board: Joi.string().required(),
      schoolId: Joi.string(),
      start: Joi.number(),
      end: Joi.number(),
      isDeleted: Joi.boolean(),
      classDetails: Joi.array().items(
        Joi.object({
          _id: Joi.string(),
          section: Joi.string(),
          standard: Joi.number().required(),
          boysStrength: Joi.number().required(),
          girlsStrength: Joi.number().required(),
          totalStrength: Joi.number().required(),
        })
      ),
    })
  ),
});


const schoolSchema = Joi.object({
  schoolId: Joi.number()
  .integer()
  .min(10000000000) 
  .max(99999999999)
  .required()
  .messages({
    "number.base": "DiseCode must be an 11-digit number.",
    "number.min": "DiseCode must be an 11-digit number.",
    "number.max": "DiseCode must be an 11-digit number.",
    "any.required": "DiseCode is required.",
  }),
  name: Joi.string().min(5).required().messages({
    "string.base": "School name should be text.",
    "string.min": "School name must be at least 5 characters long.",
    "any.required": "School name is required.",
  }),
  boards: Joi.array()
  .items(
	Joi.string()
	  .valid('CBSE', 'ICSE', 'KSEEB')
	  .required()
	  .messages({
		'any.only': 'Each board must be either "CBSE", "ICSE", or "KSEEB".',
	  })
  )
  .unique() 
  .required()
  .messages({
	'array.base': 'Boards must be an array of strings.',
	'array.unique': 'Each board in the array must be unique.',
	'any.required': 'Boards are required.',
  }),
  state: Joi.string().required(),
  zone: Joi.string().required(),
  district: Joi.string().required(),
  block: Joi.string().required(),
  mediums: Joi.array()
  .items(
	Joi.string()
	  .valid('kannada', 'english')
	  .required()
	  .messages({
		'any.only': 'Each medium must be either "kannada" or "english".',
	  })
  )
  .unique()  
  .required()
  .messages({
	'array.base': 'Mediums must be an array of strings.',
	'array.unique': 'Each medium in the array must be unique.',  
	'any.required': 'Mediums are required.',
  }),
  academicYearStartDate: Joi.date().iso().required()
  .custom(validateIsoDate)
  .messages({
    'date.base': 'Academic Year Start Date must be a valid date.',
    'date.format': 'Academic Year Start Date must follow ISO date format (yyyy-mm-dd).',
    'date.invalid': 'Academic Year Start Date contains an invalid date.',
    'any.required': 'Academic Year Start Date is required.',
  }),

academicYearEndDate: Joi.date().iso().required()
  .custom(validateIsoDate)
  .messages({
    'date.base': 'Academic Year End Date must be a valid date.',
    'date.format': 'Academic Year End Date must follow ISO date format (yyyy-mm-dd).',
    'date.invalid': 'Academic Year End Date contains an invalid date.',
    'any.required': 'Academic Year End Date is required.',
  }),
});

const validateSchool = validateRequest(schema);

module.exports = {
  validateSchool,
  schoolSchema,
};

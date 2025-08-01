const Joi = require("joi");


const questionBankCommonSchema = {
    medium: Joi.string().required(),
    board: Joi.string().required(),
    grade: Joi.number().required(),
    subject: Joi.string().required(),
    chapter: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
      ),
    subTopic: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.valid(null)
      ),
    totalMarks:Joi.number().required(),
    examinationName: Joi.string().required(),
    chapterIds: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
      ).required(),
    isMultiChapter:Joi.boolean().required(),
    marksDistribution:Joi.array()
    .items({
        unit_name: Joi.string(),
        marks: Joi.number(),
        percentage_distribution: Joi.number(),
    })
    .required()
}

const questionBankTemplateSchemaCreate = Joi.object(
    {
    ...questionBankCommonSchema
    }
);

const questionBankBluePrintSchemaCreate = Joi.object(
    {
    ...questionBankCommonSchema,
    objective_distribution:Joi.array()
    .items({
        objective: Joi.string(),
        percentage_distribution: Joi.number(),
    })
    .required(),
    template:Joi.array()
    .items({
        type: Joi.string(),
        number_of_questions: Joi.number(),
        marks_per_question: Joi.number(),
        question_distribution: Joi.valid(null),
    })
    .required(),
    }
);

const questionBankSchemaCreate = Joi.object(
    {
    ...questionBankCommonSchema,
    objectiveDistribution:Joi.array()
    .items({
        objective: Joi.string(),
        percentage_distribution: Joi.number(),
    }),
    questionBankTemplate:Joi.array()
    .items({
        type: Joi.string(),
        number_of_questions: Joi.number(),
        marks_per_question: Joi.number(),
        question_distribution: Joi.valid(null),
    }),
    template:Joi.array()
    .items({
        type: Joi.string(),
        number_of_questions: Joi.number(),
        marks_per_question: Joi.number(),
        question_distribution: Joi.array()
        .items({
            unit_name: Joi.string(),
            objective: Joi.string(),
        })
    })
    .required(),
    }
);

const questionBankFeedbackSchema = Joi.object(
    {
        question: Joi.string().required(),
        feedback: Joi.string().required(),
        overallFeedback: Joi.string().allow("")
    }
)

const validateQuestionBankTemplateCreate = (req, res, next) => {
    const data = req.body;

    let isValid = questionBankTemplateSchemaCreate.validate(data, { abortEarly: false });

    if (isValid.error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: isValid.error.details.map((i) => i.message),
        });
    }
    next();
};

const validateQuestionBankBluePrintCreate = (req, res, next) => {
    const data = req.body;

    let isValid = questionBankBluePrintSchemaCreate.validate(data, { abortEarly: false });

    if (isValid.error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: isValid.error.details.map((i) => i.message),
        });
    }
    next();
};

const validateQuestionBankCreate = (req, res, next) => {
    const data = req.body;

    let isValid = questionBankSchemaCreate.validate(data, { abortEarly: false });

    if (isValid.error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: isValid.error.details.map((i) => i.message),
        });
    }
    next();
};

const validateQuestionBankFeedbackCreate = (req, res, next) => {
    const data = req.body;

    let isValid = questionBankFeedbackSchema.validate(data, { abortEarly: false });

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
    validateQuestionBankCreate,
    validateQuestionBankTemplateCreate,
    validateQuestionBankBluePrintCreate,
    validateQuestionBankFeedbackCreate
};

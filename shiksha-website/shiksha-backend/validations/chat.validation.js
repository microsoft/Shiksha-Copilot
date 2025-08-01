const Joi = require('joi');

const validateChatStart = (req, res, next) => {
    const data = req.body;
    
    const schema = Joi.object({
        user_info: Joi.object({
            user_id: Joi.string().required().messages({
                'any.required': 'User ID is required',
            }),
            name: Joi.string().required().messages({
                'any.required': 'User name is required',
            }),
            email: Joi.string().email().required().messages({
                'any.required': 'User email is required',
                'string.email': 'Invalid email format',
            }),
        }).required().messages({
            'any.required': 'User info is required',
        }),
        user_message: Joi.string().required().messages({
            'any.required': 'User message is required',
        }),
        contextName: Joi.string().required().messages({
            'any.required': 'Context name is required',
        }),
    });

    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: error.details.map((i) => i.message),
        });
    }
    next();
};

const validateChatContinue = (req, res, next) => {
    const data = req.body;

    const schema = Joi.object({
        chat_history_id : Joi.string().required().messages({
            'any.required': 'Chat history ID is required',
        }),
        user_message: Joi.string().required().messages({
            'any.required': 'User message is required',
        }),
        user_id: Joi.string().required().messages({
            'any.required': 'User ID is required',
        }),
    });

    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: error.details.map((i) => i.message),
        });
    }
    next();
};

const validateChatEnd = (req, res, next) => {
    const data = req.body;

    const schema = Joi.object({
        chat_history_id: Joi.string().required().messages({
            'any.required': 'Chat history ID is required',
        }),
    });

    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
        return res.status(400).json({
            success: false,
            data: false,
            error: error.details.map((i) => i.message),
        });
    }
    next();
};

module.exports = {
    validateChatStart,
    validateChatContinue,
    validateChatEnd,
};

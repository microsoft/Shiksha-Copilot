const validateRequest = (schema) => {
    return (req, res, next) => {
        const data = req.body;

        const isValid = schema.validate(data, { abortEarly: false });

        if (isValid.error) {
            return res.status(400).json({
                success: false,
                data: false,
                error: isValid.error.details.map((i) => i.message),
            });
        }

        if (req.originalUrl.includes("update")) {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    data: false,
                    error: "ID parameter is required",
                });
            }
        }

        next();
    };
};

module.exports = validateRequest;
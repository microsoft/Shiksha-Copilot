const validateTeacherLessonPlan = (req, res, next) => {
	if (req.query.filter) {
		let filter = req.query.filter;

		if (Object.keys(filter).length > 0 && !filter.type) {
			return res.status(400).json({
				success: false,
				data: false,
				message: "Filter 'type' is required",
			});
		}
	}
	next();
};

module.exports = {
	validateTeacherLessonPlan,
};

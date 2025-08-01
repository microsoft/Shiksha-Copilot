const LessonFeedback = require("../models/feedback.lesson.model");
const BaseDao = require("./base.dao.js");

class LessonFeedbackDao extends BaseDao {
	constructor() {
		super(LessonFeedback);
	}

	async getByTeacher(teacherId) {
		try {
			let result = await LessonFeedback.find({ teacherId });
			return result;
		} catch (err) {
			console.log("Error --> LessonFeedbackDao -> getByTeacher()", err);
			throw err;
		}
	}

	async getByTeacherAndLessonId(teacherId, lessonId) {
		try {
			let result = await LessonFeedback.findOne({ teacherId, lessonId });
			return result;
		} catch (err) {
			console.log(
				"Error --> LessonFeedbackDao -> getByTeacherAndLessonId()",
				err
			);
			throw err;
		}
	}

	async update(id, updates, session = null) {
		try {
			const result = await LessonFeedback.findOneAndUpdate(
				{
					_id: id,
				},
				{
					$set: updates,
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> LessonFeedbackDao -> update", err);
			throw err;
		}
	}
}

module.exports = LessonFeedbackDao;

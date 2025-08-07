const BaseManager = require("./base.manager");
const LessonFeedbackDao = require("../dao/feedback.lesson.dao");
const formatApiReponse = require("../helper/response");

class LessonFeedbackManager extends BaseManager {
	constructor() {
		super(new LessonFeedbackDao());
		this.lessonFeedbackDao = new LessonFeedbackDao();
	}

	async create(req) {
		try {
			let { _id: teacherId } = req.user;

			let { lessonId, isCompleted } = req.body;

			let lessonFeedback = await this.lessonFeedbackDao.getByTeacherAndLessonId(
				teacherId,
				lessonId
			);

			if (!lessonFeedback) {
				let data = await this.lessonFeedbackDao.create({
					...req.body,
					teacherId,
				});

				return formatApiReponse(
					true,
					isCompleted ? "Feedback submitted!" : "Saved Feedback as Draft!",
					data
				);
			}

			if (!lessonFeedback.isCompleted) {
				let data = await this.lessonFeedbackDao.update(lessonFeedback._id, {
					...req.body,
					teacherId,
				});
				
				return formatApiReponse(true, isCompleted ? "Feedback submitted!" : "Saved Feedback as Draft!", data);
			}

			return formatApiReponse(
				false,
				"Feedback already submitted!",
				lessonFeedback
			);
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}

	async getByTeacher(teacherId) {
		try {
			const feedbacks = await this.lessonFeedbackDao.getByTeacher(teacherId);
			if (!feedbacks) {
				return formatApiReponse(false, "failed to load feedbacks", null);
			}
			return formatApiReponse(true, "", feedbacks);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async update(id, updates) {
		try {
			const updatedFeedback = await this.lessonFeedbackDao.update(id, updates);
			if (!updatedFeedback) {
				return formatApiReponse(
					false,
					"failed to update lesson feedback",
					null
				);
			}
			return formatApiReponse(true, "", updatedFeedback);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = LessonFeedbackManager;

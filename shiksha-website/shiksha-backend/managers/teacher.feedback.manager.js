const BaseManager = require("./base.manager");
const TeacherResourceFeedbackDao = require("../dao/teacher.feedback.dao");
const formatApiReponse = require("../helper/response");

class TeacherResourceFeedbackManager extends BaseManager {
	constructor() {
		super(new TeacherResourceFeedbackDao());
		this.teacherResourceFeedbackDao = new TeacherResourceFeedbackDao();
	}

	async create(req) {
		try {
			let { _id: teacherId } = req.user;

			let { resourceId, isCompleted } = req.body;

			let resourceFeedback = await this.teacherResourceFeedbackDao.getOne({
				teacherId,
				resourceId,
			});

			if (!resourceFeedback) {
				let data = await this.teacherResourceFeedbackDao.create({
					...req.body,
					teacherId,
				});

				return formatApiReponse(
					true,
					isCompleted ? "Feedback submitted!" : "Saved Feedback as Draft!",
					data
				);
			}

			if (!resourceFeedback.isCompleted) {
				let data = await this.teacherResourceFeedbackDao.update(
					resourceFeedback._id,
					{
						...req.body,
						teacherId,
					}
				);

				return formatApiReponse(true, isCompleted ? "Feedback submitted!" : "Saved Feedback as Draft!", data);
			}

			return formatApiReponse(
				false,
				"Feedback already submitted!",
				resourceFeedback
			);
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}

	async update(id, updates) {
		try {
			const updatedFeedback = await this.teacherResourceFeedbackDao.update(
				id,
				updates
			);
			if (!updatedFeedback) {
				return formatApiReponse(false, "Feedback not found", null);
			}
			return formatApiReponse(true, "", updatedFeedback);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = TeacherResourceFeedbackManager;

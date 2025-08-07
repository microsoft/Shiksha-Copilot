const handleError = require("../helper/handleError.js");
const LessonFeedbackManager = require("../managers/feedback.lesson.manager.js");
const BaseController = require("./base.controller.js");

class LessonFeedbackController extends BaseController {
	constructor() {
		super(new LessonFeedbackManager());
		this.lessonFeedbackManager = new LessonFeedbackManager();
	}

	async getByTeacher(req, res) {
		try {
			const { teacherId } = req.params;
			const result = await this.lessonFeedbackManager.getByTeacher(teacherId);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result.data);
		} catch (err) {
			console.log("Error --> LessonFeedbackController -> getByTeacher()", err);
			return res.status(400).json(err);
		}
	}

	async update(req, res) {
		try {
			const { id } = req.params;
			const result = await this.lessonFeedbackManager.update(id, req.body);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result.data);
		} catch (err) {
			console.log("Error --> LessonFeedbackController -> update()", err);
			return res.status(400).json(err);
		}
	}
}

module.exports = LessonFeedbackController;

const handleError = require("../helper/handleError.js");
const MasterLessonManger = require("../managers/master.lesson.manager.js");
const BaseController = require("./base.controller.js");

class MasterLessonController extends BaseController {
	constructor() {
		super(new MasterLessonManger());
		this.masterLessonManager = new MasterLessonManger();
	}

	async saveToTeacher(req, res) {
		try {
			let { _id: teacherId } = req.user;

			let result = await this.masterLessonManager.saveToTeacher(
				teacherId,
				req.body
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> MasterLessonController -> saveToTeacher()", err);
			return res.status(400).json(err);
		}
	}

	async getActivityById(req, res) {
		try {
			const { id } = req.params;
	
			const result = await this.masterLessonManager.getActivityById(id);
	
			if (result.success) {
				return res.status(200).json(result);
			}
	
			handleError(result, res);
			return;
		} catch (err) {
			console.log("Error --> MasterLessonController -> getActivityById()", err);
			return res.status(400).json(err);
		}
	}

	async getByTeacher(req, res) {
		try {
			let { _id: teacherId } = req.user;
			let reqBody = req.body;
			let result = await this.masterLessonManager.getByTeacher(
				teacherId,
				reqBody
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> MasterLessonController -> getByTeacher()", err);
			return res.status(400).json(err);
		}
	}

	async update(req, res) {
		try {
			let result = await this.masterLessonManager.update(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> MasterLessonController -> update()", err);
			return res.status(400).json(err);
		}
	}

	async regenerateLessonPlan(req, res) {
		try {
			const accessibleRoles = ["power", "admin", "manager"];
			if (!accessibleRoles.includes(req.user.role)) {
				return res.status(403).json({
					message:
						"Forbidden: You do not have the required permissions to perform this action.",
				});
			}

			const { lessonId, reason } = req.body;

			const result = await this.masterLessonManager.regenerateLessonPlan({
				lessonId,
				reason,
				userId: req.user._id,
			});

			if (result.success) {
				return res.status(200).json(result.data);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log(
				"Error --> MasterLessonController -> regenerateLessonPlan()",
				err
			);
			return res.status(400).json(err);
		}
	}

	async comboScript(req, res) {
		try {
			const { board = "CBSE", medium = "English", isAll = true } = req.body;
			const result = await this.masterLessonManager.comboScript(
				board,
				medium,
				isAll
			);
			if (result.success) {
				return res.status(200).json(result.data);
			}
			handleError(result, res);
			return;
		} catch (err) {
			console.log("Error --> MasterLessonController -> comboScript()", err);
			return res.status(400).json(err);
		}
	}

	async getLessonOutcomes(req, res) {
		try {
			const { chapterId } = req.params;
			const { filters = {} } = req.query;
			const result = await this.masterLessonManager.getLessonOutcomes(
				chapterId,
				filters
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
			return;
		} catch (err) {
			console.log(
				"Error --> MasterLessonController -> getLessonOutcomes()",
				err
			);
			return res.status(400).json(err);
		}
	}

	async generateLessonPlan(req, res) {
		try {
			const { lessonId } = req.params;
			const { _id: teacherId } = req.user;
			const { filters = {} } = req.query;
			const result = await this.masterLessonManager.generateLessonPlan(
				teacherId,
				lessonId,
				filters
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
			return;
		} catch (err) {
			console.log(
				"Error --> MasterLessonController -> generateLessonPlan()",
				err
			);
			return res.status(400).json(err);
		}
	}

	async updateLessonPlan(req, res) {
        try {
            return res.status(200).json({ message: "Lesson plan updated successfully" });
        } catch (err) {
            console.log("Error --> MasterLessonController -> updateLessonPlan()", err);
            return res.status(400).json(err);
        }
    }

	async get5ETables(req,res)
	{
		try {
			const { lessonId } = req.params;
			const { _id: user_id , name : user_name }  = req.user
			const result = await this.masterLessonManager.generate5ETables(
				lessonId,
				user_id,
				user_name
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
			return;
		} catch (err) {
			console.log(
				"Error --> MasterLessonController -> generate5ETables",
				err
			);
			return res.status(400).json(err);
		}
	}

	async scriptLpDump(req, res) {
		try {
			let result = await this.masterLessonManager.scriptLpDump(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> MasterLessonController -> scriptLpDump()", err);
			return res.status(400).json(err);
		}
	}

}


module.exports = MasterLessonController;

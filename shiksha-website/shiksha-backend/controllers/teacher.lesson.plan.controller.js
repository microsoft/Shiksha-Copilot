const handleError = require("../helper/handleError.js");
const TeacherLessonPlanManager = require("../managers/teacher.lesson.plan.manager.js");
const BaseController = require("./base.controller.js");
class TeacherLessonPlanController extends BaseController {
	constructor() {
		super(new TeacherLessonPlanManager());
		this.teacherLessonPlanManager = new TeacherLessonPlanManager();
	}

	async getByTeacherAndPagination(req, res) {
		try {
			const {
				page = 1,
				limit = 999,
				filter = {},
				sortBy = "createdAt",
				sortOrder = "desc",
				search = "",
			} = req.query;

			const { _id: teacherId } = req.user;

			const sortOrderObject =
				sortOrder === "desc" ? { [sortBy]: -1 } : { [sortBy]: 1 };

			const searchFilter = {};

			if (search) {
				const searchFields = [
					"lesson.name",
					"resource.lessonName",
					"lesson.chapter.topics",
					"resource.chapter.topics",
					"lesson.chapter.subTopics",
					"resource.chapter.subTopics",
				];

				const regexExpressions = searchFields.map((field) => ({
					[field]: { $regex: new RegExp(search, "i") },
				}));

				searchFilter.$or = regexExpressions;
			}

			const result =
				await this.teacherLessonPlanManager.getByTeacherAndPagination(
					teacherId,
					parseInt(page),
					parseInt(limit),
					{ ...filter, ...searchFilter },
					sortOrderObject
				);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> TeacherLessonPlanController -> getAll()", err);
			return res.status(400).json(err);
		}
	}

	async getMonthlyCount(req, res) {
		try {
			const teacherId = req.user._id;

			let filter = req.query.filter;

			const monthlyCounts = await this.teacherLessonPlanManager.getMonthlyCount(
				teacherId,
				filter
			);

			if (monthlyCounts.success) {
				return res.status(200).json(monthlyCounts.data);
			}

			handleError(monthlyCounts, res);

			return;
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanController -> getMonthlyCount()",
				err
			);
			return res.status(500).json({ error: "Internal server error" });
		}
	}


	async getRegenerationLimit(req, res) {
		try {
			const teacherId = req.user._id;

			const regenerationLimit = await this.teacherLessonPlanManager.getRegenerationLimit(
				teacherId
			);

			if (regenerationLimit.success) {
				return res.status(200).json(regenerationLimit);
			}

			handleError(regenerationLimit, res);

			return;
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanController -> getRegenerationLimit()",
				err
			);
			return res.status(500).json({ error: "Internal server error" });
		}
	}

	async checkIfLessonPlanExists(req, res) {
		try {
			const { lessonPlanId } = req.params;
			const teacherId = req.user._id;

			const doesLessonPlanExists =
				await this.teacherLessonPlanManager.checkIfLessonPlanExists(
					teacherId,
					lessonPlanId
				);

			if (!doesLessonPlanExists) {
				return res.status(200).json({ choose: true });
			} else {
				return res.status(404).json({ choose: false });
			}
		} catch (error) {
			console.error("Error checking if lesson plan exists:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
	
	async getLessonPlanById(req, res) {
		try {
			const { lessonPlanId } = req.params;
			const teacherId = req.user._id;

			const lessonPlan = await this.teacherLessonPlanManager.getLessonPlanById(
				teacherId,
				lessonPlanId
			);

			if (lessonPlan) {
				return res.status(200).json(lessonPlan);
			} else {
				return res.status(404).json({ message: "Lesson plan not found" });
			}
		} catch (error) {
			console.error("Error getting lesson plan by ID:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	}

	async getResourcePlanById(req, res) {
		try {
			const { resourcePlanId } = req.params;
			const teacherId = req.user._id;

			const resourcePlan = await this.teacherLessonPlanManager.getResourcePlanById(
				teacherId,
				resourcePlanId
			);
			if (resourcePlan) {
				return res.status(200).json(resourcePlan);
			} else {
				return res.status(404).json({ message: "Resource plan not found" });
			}
		} catch (error) {
			console.error("Error getting Resource plan by ID:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	}

	async generateContent(req, res) {
        try {
            const payload = req.body;
            const teacherId = req.user._id;
            const role = req.user.role;
            const allowedRoles = ["power", "admin"];
            if (!allowedRoles.includes(...role)) {
                return res.status(403).json({ error: "Forbidden: You do not have the required role to perform this action" });
            }

            const result = await this.teacherLessonPlanManager.generateContent(teacherId, payload);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                handleError(result, res);
                return;
            }
        } catch (error) {
            console.error("Error -> TeacherLessonPlanController -> generateContent", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    async regenerateContent(req, res) {
        try {
            const payload = req.body;
            const teacherId = req.user._id;
            const role = req.user.role;
            const allowedRoles = ["power", "admin"];
            if (!allowedRoles.includes(...role)) {
                return res.status(403).json({ error: "Forbidden: You do not have the required role to perform this action" });
            }

            const result = await this.teacherLessonPlanManager.regenerateContent(teacherId, payload);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                handleError(result, res);
                return;
            }
        } catch (error) {
            console.error("Error -> TeacherLessonPlanController -> regenerateContent", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

	async handleWebhook(req, res) {
        try {
            const data = req.body;
            await this.teacherLessonPlanManager.processWebhookData(data);
            res.status(200).send({ success: true });
        } catch (error) {
            console.error("Error handling webhook event:", error);
            res.status(500).send({ success: false, error: "Webhook handling failed" });
        }
    }

	async retryLessonPlan(req, res) {
		try {
			const { regeneratedId, _id } = req.body; 
			const role = req.user.role;
			const allowedRoles = ["power", "admin"];
	
			if (!allowedRoles.includes(...role)) {
				return res.status(403).json({ error: "Forbidden: You do not have the required role to perform this action" });
			}
	
			const result = await this.teacherLessonPlanManager.retryLessonPlan(regeneratedId, _id);
	
			if (result.success) {
				return res.status(200).json(result);
			} else {
				handleError(result, res);
				return;
			}
		} catch (error) {
			console.error("Error -> TeacherLessonPlanController -> retryLessonPlan", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	}

}

module.exports = TeacherLessonPlanController;

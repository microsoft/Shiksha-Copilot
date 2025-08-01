const BaseManager = require("./base.manager");
const MasterResourceDao = require("../dao/master.resource.dao");
const RegeneratedLessonResourceDao = require("../dao/regenerate.log.dao");
const formatApiResponse = require("../helper/response");
const regenerateLessonPlan = require("../services/copilot.bot.service");
const Chapter = require("../models/chapter.model");
const MasterSubjectDao = require("../dao/master.subject.dao");
const { createData } = require("../helper/data.helper");
const { uniqueSubsets } = require("../helper/filter.helper");
const formatApiReponse = require("../helper/response");
const TeacherLessonPlanDao = require("../dao/teacher.lesson.plan.dao");
const { sortDataBySubTopics } = require("../helper/formatter");

class MasterResourceManager extends BaseManager {
	constructor() {
		super(new MasterResourceDao());
		this.masterResourceDao = new MasterResourceDao();
		this.teacherLessonPlanDao = new TeacherLessonPlanDao();
		this.regenerateResourceLog = new RegeneratedLessonResourceDao();
		this.masterSubjectDao = new MasterSubjectDao();
	}

	async updateMasterResource(id, updates) {
		try {
			const updatedResource = await this.masterResourceDao.update(id, updates);
			if (!updatedResource) {
				return formatApiResponse(false, "Master resource not found", null);
			}
			return formatApiResponse(true, "", updatedResource);
		} catch (err) {
			return formatApiResponse(false, err?.message, err);
		}
	}

	async regenerateResourcePlan({ resourceId, reason, userId }) {
		try {
			const resourcePlan = await this.masterResourceDao.getById(resourceId);
			if (!resourcePlan) {
				return formatApiResponse(false, "Resource plan not found", null);
			}

			const regeneratedResource = await regenerateLessonPlan();

			const newResourcePlan = {
				lessonName: resourcePlan.lessonName,
				class: resourcePlan.class,
				medium: resourcePlan.medium,
				board: resourcePlan.board,
				semester: resourcePlan.semester,
				subject: resourcePlan.subject,
				levels: resourcePlan.levels,
				topics: resourcePlan.topics,
				resources: regeneratedResource.resources,
			};

			const savedResourcePlan = await this.masterResourceDao.create(
				newResourcePlan
			);

			const regeneratedLog = {
				contentId: resourceId,
				genContentId: savedResourcePlan._id,
				isLesson: false,
				reasons: reason,
				generatedBy: userId,
			};

			await this.regenerateResourceLog.create(regeneratedLog);

			return formatApiResponse(
				true,
				"Resource plan generated successfully",
				savedResourcePlan
			);
		} catch (err) {
			console.log(
				"Error -> MasterResourceManager -> regenerateResourcePlan",
				err
			);
			return formatApiResponse(false, err?.message, err);
		}
	}

	async comboScript(board, medium) {
		try {
			const chapters = await Chapter.find({ board, medium });
			for (const chapter of chapters) {
				const subject = await this.masterSubjectDao.getById(chapter.subjectId);
				let subTopicSubSets = uniqueSubsets(chapter.subTopics);
				for (const subTopic of subTopicSubSets) {
					const newResourcePlan = createData(false, chapter, subTopic, subject);
					await this.masterResourceDao.create(newResourcePlan);
				}
			}
			return formatApiResponse(true, "", "Data inserted!");
		} catch (err) {
			console.log("Error -> MasterResourceManager -> ComboScript", err);
			return formatApiResponse(false, err?.message, err);
		}
	}

	async getSubtopicResourceList(chapterId) {
		try {
			let result = await this.masterResourceDao.getSubtopicResourceList(
				chapterId
			);

			result = sortDataBySubTopics(result);

			if (result) {
				return formatApiReponse(true, "", result);
			}

			return formatApiResponse(true, "", result);
		} catch (err) {
			console.log(
				"Error -> MasterResourceManager -> getSubtopicResourceList",
				err
			);
			return formatApiResponse(false, err?.message, err);
		}
	}

	async generateResourcePlan(teacherId, resourceId, filters) {
		try {
			const resourcePlan =
				await this.teacherLessonPlanDao.getByTeacherAndResource(
					teacherId,
					resourceId
				);

			if (resourcePlan && !resourcePlan.isCompleted) {
				return formatApiReponse(false, "Draft Exists", resourcePlan);
			}

			if (resourcePlan) {
				return formatApiReponse(
					false,
					"Lesson Resource Plan with this combination has already been saved!",
					resourcePlan
				);
			}

			const result = await this.masterResourceDao.generateResourcePlan(
				resourceId,
				filters
			);

			if (result) {
				return formatApiReponse(true, "", result);
			}

			return formatApiReponse(false, "No Data available", null);
		} catch (err) {
			console.error(
				"Error --> MasterResourceManager -> generateResourcePlan()",
				err
			);
			return formatApiReponse(false, err.message, err);
		}
	}
}

module.exports = MasterResourceManager;

const masterLessonAggregation = require("../aggregation/master.lesson.aggregation");
const MasterLesson = require("../models/master.lesson.model");
const BaseDao = require("./base.dao.js");
const mongoose = require("mongoose");
const TeacherLessonPlanDao = require("./teacher.lesson.plan.dao");

class MasterLessonDao extends BaseDao {
	constructor() {
		super(MasterLesson);
		this.teacherLessonPlanDao = new TeacherLessonPlanDao();
	}

	async getAll(
		page = 1,
		limit = 10,
		filters = {},
		sort = {},
		includeDeleted,
		userId
	) {
		try {
			const processedFilters = {};

			for (const key in filters) {
				if (key === "class") {
					processedFilters[key] = Number(filters[key]);
				} else if (key === "includeVideos" && filters[key] === "true") {
					processedFilters["videos"] = {
						$exists: true,
						$not: {
							$size: 0,
						},
					};
				} else if (key === "topics" || key === "board" || key === "medium") {
					processedFilters[`chapter.${key}`] = filters[key];
				} else if (key === "subTopics") {
					let targetItems = JSON.parse(filters[key]);
					processedFilters["$expr"] = {
						$and: [
							{ $isArray: "$subTopics" },
							{ $gt: [{ $size: "$subTopics" }, 0] },
							{ $eq: [{ $size: "$subTopics" }, targetItems.length] },
							{ $eq: [{ $type: "$subTopics" }, "array"] },
							{ $setIsSubset: [targetItems, "$subTopics"] },
							{ $setIsSubset: ["$subTopics", targetItems] },
						],
					};
				} else if (key === "includeVideos" && filters[key] !== "true") {
					processedFilters["videos"] = { $size: 0 };
				} else {
					processedFilters[key] = filters[key];
				}
			}

			const results = await masterLessonAggregation.getMasterLessonFilter(
				page,
				limit,
				processedFilters,
				sort
			);
			if (results[0].data.length === 1) {
				const lessonId = results[0].data[0]._id;
				const existingPlan = await this.teacherLessonPlanDao.getOne({
					teacherId: userId,
					lessonId: lessonId,
				});
				if (existingPlan) {
					throw new Error(
						"There is a single LP available and the lesson plan already exists."
					);
				}
			}
			const totalItems =
				results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

			return {
				page,
				totalItems,
				limit,
				results: results[0].data,
			};
		} catch (err) {
			console.log("Error --> MasterLessonDao -> getAll()", err);
			throw err;
		}
	}

	async getByType(type) {
		try {
			let plan = await MasterLesson.findOne({ type, isDeleted: false });
			if (plan) return plan;
			return false;
		} catch (err) {
			console.log("Error -> MasterLessonDao -> getByType", err);
			throw err;
		}
	}

	async update(data, session = null) {
		try {
			const result = await MasterLesson.findOneAndUpdate(
				{
					_id: data?.id,
					isDeleted: false,
				},
				{
					$set: {
						instructionSet : data?.instructionSet,
						extractedResources : data?.extractedResources,
						checkList: data?.checkList
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> MasterLessonDao -> update", err);
			throw err;
		}
	}

	async updateByFilter(filter, updateData) {
		try {
			const result = await MasterLesson.findOneAndUpdate(
				filter,
				{ $set: updateData },
				{ new: true }
			);

			return result;
		} catch (err) {
			console.log("Error --> MasterLessonDao -> updateByFilter()", err);
			throw err;
		}
	}

	async getLessonOutcomes(chapterId, filters = {}) {
		try {
			const result = await masterLessonAggregation.getLessonOutcomes(
				chapterId,
				filters
			);

			if (result.success) {
				return result.data;
			} else {
				throw new Error("Failed to retrieve lesson outcomes");
			}
		} catch (err) {
			console.log("Error --> MasterLessonDao -> getLessonOutcomes", err);
			throw err;
		}
	}

	async generateLessonPlan(lessonId, filters = {}) {
		try {
			let processedFilters = { ...filters };

			const result = await masterLessonAggregation.generateLessonPlan(
				lessonId,
				processedFilters
			);
			
			if (result.success) {
				return result.data;
			}

			return false;
		} catch (err) {
			console.log("Error --> MasterLessonDao -> generateLessonPlan", err);
			throw err;
		}
	}
}

module.exports = MasterLessonDao;

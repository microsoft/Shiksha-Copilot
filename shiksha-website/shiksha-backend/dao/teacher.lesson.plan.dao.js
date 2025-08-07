const teacherLessonPlanAggregation = require("../aggregation/teacher.lesson.plan.aggregation.js");
const TeacherLessonPlan = require("../models/teacher.lesson.plan.model.js");
const BaseDao = require("./base.dao.js");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

class TeacherLessonPlanDao extends BaseDao {
	constructor() {
		super(TeacherLessonPlan);
	}

	async saveToTeacher(teacherId, data, session = null) {
		try {
			data["isLesson"] = false;

			if (data?.lessonId) {
				data["isLesson"] = true;
			}

			let model = new TeacherLessonPlan({ ...data, teacherId });
			let result = await model.save(session ? { session } : {});

			return result;
		} catch (err) {
			console.log("Error --> TeacherLessonPlanDao --> saveToTeacher");
			throw err;
		}
	}

	async updatePlan(planId, data) {
		try {
		  let update = {
			...data
		  };
	
		  let options = { new: true };
	
		  return await TeacherLessonPlan.findByIdAndUpdate(planId, update, options);
		} catch (err) {
		  console.log("Error --> TeacherLessonPlanDao --> updatePlan", err);
		  throw err;
		}
	  }

	async getByTeacher(teacherId, filters) {
		try {
			const processedFilters = {};
			let collection = "resource";

			if (filters.isLesson === "1") {
				collection = "lesson";
			}

			for (const key in filters) {
				if (key == "class") {
					processedFilters[`${collection}.class`] = Number(filters[key]);
				} else if (key == "isLesson") {
					continue;
				} else {
					processedFilters[`${collection}.${key}`] = filters[key];
				}
			}

			let lessonPlans =
				await teacherLessonPlanAggregation.getLessonBasedOnTeacherAndFilters(
					teacherId,
					processedFilters
				);

			return lessonPlans;
		} catch (err) {
			console.log("Error --> TeacherLessonPlanDao --> getByTeacher");
			throw err;
		}
	}

	async getByTeacherAndPagination(
		teacherId,
		collection,
		page = 1,
		limit = 10,
		filters = {},
		sort = {}
	) {
		try {
			const processedFilters = {};

			for (const key in filters) {
				switch (key) {
					case "class": {
						processedFilters[`${collection}.class`] = Number(filters[key]);
						break;
					}
					case "type": {
						processedFilters["isLesson"] = collection == "lesson";
						break;
					}
					case "isCompleted" :{
						processedFilters["isCompleted"] = filters[key] === "true";
						break;
					}
					case "createdMonth": {
						processedFilters[key] = Number(filters[key]);
						break;
					}
					case "subTopics": {
						processedFilters[`${collection}.${key}`] = {
							$in: [filters[key], "$lesson.subTopics"],
						};
						break;
					}
					case "isGroupedSubTopics": {
						processedFilters[key] = filters[key] === "true";
						break;
					}
					case "isGenerated": {
						if (filters[key] === "true") {
								processedFilters["$and"] = [
								{ isGenerated: true },
								{ isCompleted: false }
							];
						} else {
							processedFilters["$or"] = [
								{ isGenerated: { $ne: true } },
								{ isCompleted: { $ne: false } }
							];
						}
						break;
					}
					case "topics":
					case "board":
					case "medium": {
						processedFilters[`${collection}.chapter.${key}`] = filters[key];
						break;
					}
					case "$or": {
						processedFilters[key] = filters[key];
						break;
					}
					default: {
						processedFilters[`${collection}.${key}`] = filters[key];
						break;
					}
				}
			}

			let results =
				await teacherLessonPlanAggregation.getByTeacherAndPagination(
					teacherId,
					page,
					limit,
					processedFilters,
					sort
				);


			const totalItems =
				results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;
			return {
				page,
				totalItems,
				limit,
				results: results[0].data,
			};
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanDao --> getByTeacherAndPagination"
			);
			throw err;
		}
	}

	async getByTeacherAndLesson(teacherId, lessonId) {
		try {
			return await TeacherLessonPlan.findOne({ teacherId, lessonId });
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanDao --> getByTeacherAndLesson",
				err
			);
			throw err;
		}
	}

	async getByTeacherAndResource(teacherId, resourceId) {
		try {
			return await TeacherLessonPlan.findOne({ teacherId, resourceId });
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanDao --> getByTeacherAndResource",
				err
			);
			throw err;
		}
	}

	async updateForRegenerate(teacherId, oldLessonId, newLessonId, instanceId  ) {
		try {
			const lessonPlan = await TeacherLessonPlan.findOneAndUpdate(
				{ teacherId, lessonId: oldLessonId },
				{
					$set: {
						lessonId: newLessonId,
						instanceId,
						baseLessonId:oldLessonId,
						status :'running',
						isGenerated:true
					},
				},
				{ new: true }
			);

			if (!lessonPlan) {
				throw new Error("Lesson plan not found");
			}

			return lessonPlan;
		} catch (err) {
			console.log("Error --> TeacherLessonPlanDao --> update", err);
			throw err;
		}
	}

	async getLessonPlanById(teacherId, lessonPlanId) {
		try {
			const lessonPlan = await teacherLessonPlanAggregation.getLessonPlanById(
				teacherId,
				lessonPlanId
			);
			return lessonPlan;
		} catch (error) {
			console.error("Error getting lesson plan by ID:", error);
			throw new Error("Internal server error");
		}
	}

	async getResourcePlanById(teacherId, resourcePlanId) {
		try {
			const resourcePlan = await teacherLessonPlanAggregation.getResourcePlanById(
				teacherId,
				resourcePlanId
			);
			return resourcePlan;
		} catch (error) {
			console.error("Error getting resource plan by ID:", error);
			throw new Error("Internal server error");
		}
	}

	async getRegeneratedLessonPlansCount(teacherId, fromDate, toDate){
		try{
			const query = {
				teacherId: new ObjectId(teacherId),  
				createdAt :{ 
					$gte: fromDate, 
					$lte: toDate  
				},
				isGenerated:true
			};
	
			const regeneratedLpsCount = await TeacherLessonPlan.countDocuments(query);
			return regeneratedLpsCount
		}catch(error){
			console.error("Error getting regenerated lessonplan:", error);
			throw new Error("Internal server error");
		}
	}
}

module.exports = TeacherLessonPlanDao;

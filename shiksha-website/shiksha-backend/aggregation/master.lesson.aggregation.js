const MasterLesson = require("../models/master.lesson.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class MasterLessonAggregation {
	async getMasterLessonFilter(page, limit, filter, sort) {
		try {
			let pipeline = [
				{
					$lookup: {
						from: "chapters",
						localField: "chapterId",
						foreignField: "_id",
						as: "chapter",
					},
				},
				{
					$unwind: "$chapter",
				},
				{ $match: filter },
				{
					$facet: {
						data: [
							{ $sort: sort },
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
						],
						totalCount: [{ $count: "count" }],
					},
				},
			];

			let lessons = await MasterLesson.aggregate(pipeline);

			if (lessons) return lessons;

			return [];
		} catch (err) {
			console.log(
				"Error --> MasterLessonAggregation --> getMasterLessonFilter"
			);
			throw err;
		}
	}

	async getLessonOutcomes(chapterId, filters = {}) {
		try {
			let pipeline = [
				{
					$match: { chapterId: new ObjectId(chapterId), ...filters , isRegenerated : false },
				},

				{
					$project: {
						_id: 1,
						isAll: 1,
						learningOutcomes: 1,
						subTopics: 1,
					},
				},
			];

			let lessonOutcomes = await MasterLesson.aggregate(pipeline);

			if (lessonOutcomes) {
				return { success: true, data: lessonOutcomes };
			} else {
				return { success: true, data: null };
			}
		} catch (err) {
			console.log(
				"Error --> MasterLessonAggregation --> getLessonOutcomes",
				err
			);
			throw err;
		}
	}

	async generateLessonPlan(lessonId, filters = {}) {
		try {
			let pipeline = [
				{
					$match: { _id: new ObjectId(lessonId) },
				},
				{
					$lookup: {
						from: "chapters",
						localField: "chapterId",
						foreignField: "_id",
						as: "chapter",
					},
				},
				{
					$unwind: "$chapter",
				},
				{
					$lookup: {
						from: "mastersubjects",
						localField: "chapter.subjectId",
						foreignField: "_id",
						as: "subjects",
					},
				},
				{
					$unwind: "$subjects",
				},
				{
					$addFields: {
						videos: {
							$cond: {
								if: { $eq: [filters && filters.includeVideos, "false"] }, 
								then: [],  
								else: "$videos"  
							}
						}
					}
				}
			];

			let lessonPlan = await MasterLesson.aggregate(pipeline);

			if (lessonPlan?.length > 0) {
				return { success: true, data: lessonPlan };
			} else {
				return { success: false, data: null };
			}
		} catch (err) {
			console.log(
				"Error --> MasterLessonAggregation --> generateLessonPlan",
				err
			);
			throw err;
		}
	}
}

const masterLessonAggregation = new MasterLessonAggregation();

module.exports = masterLessonAggregation;

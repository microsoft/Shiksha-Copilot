const RegenerateLogModel = require("../models/regenerate.lesson.resource.model");

class RegenerateLogAggregation {

	_commonPipeLine(filter) {
		return [
			{
				$lookup: {
					from: "masterlessons",
					localField: "contentId",
					foreignField: "_id",
					as: "content",
				},
			},
			{
				$unwind: {
					path: "$content",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: "masterlessons",
					localField: "genContentId",
					foreignField: "_id",
					as: "genContent",
				},
			},
			{
				$unwind: {
					path: "$genContent",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: "users",
					localField: "generatedBy",
					foreignField: "_id",
					as: "user",
				},
			},
			{
				$unwind: {
					path: "$user",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: "schools",
					localField: "user.school",
					foreignField: "_id",
					as: "user.school",
				},
			},
			{
				$lookup: {
					from: "teacherlessonplans", 
					localField: "recordId",
					foreignField: "_id", 
					as: "teacherLessonPlan",
				},
			},
			{
				$unwind: {
					path: "$teacherLessonPlan",
					preserveNullAndEmptyArrays: true,
				},
			},
			{ $match: filter },
				{
					$project: {
						teacherLessonPlanStatus: "$status",
						content:"$content.name",
						genContent:"$genContent.name",
						contentId:1,
						userName:"$user.name",
						genContentId:1,
						updatedAt:1,
						createdAt:1
					},
				}
		]
	}
	async getContentActivity(page, limit, filter, sort) {
		try {
			let pipeline = [
				...this._commonPipeLine(filter),
				{
					$facet: {
						data: [
							{ $sort: { createdAt: -1 } },
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
						],
						totalCount: [{ $count: "count" }],
					},
				},
			];

			let regenerateLogs = await RegenerateLogModel.aggregate(pipeline);

			if (regenerateLogs) return regenerateLogs;

			return [];
		} catch (err) {
			console.log("Error --> RegenerateLogAggregation --> getContentActivity");
			throw err;
		}
	}

	async getAllContentActivity(filter) {
		try {
			let pipeline = [
				...this._commonPipeLine(filter),
				{
					$facet: {
						data: [
							{ $sort: { createdAt: -1 } }
						],
						totalCount: [{ $count: "count" }],
					},
				},
			];

			let allregenerateLogs = await RegenerateLogModel.aggregate(pipeline);

			if (allregenerateLogs) return allregenerateLogs;

			return [];
		} catch (err) {
			console.log("Error --> RegenerateLogAggregation --> getAllContentActivity");
			throw err;
		}
	}
}

const regenerateLogAggregation = new RegenerateLogAggregation();

module.exports = regenerateLogAggregation;

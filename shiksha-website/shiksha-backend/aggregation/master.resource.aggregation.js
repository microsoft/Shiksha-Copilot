const MasterResource = require("../models/master.resource.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class MasterResourceAggregation {
	async getMasterResourcesFilter(page, limit, filter, sort) {
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

			let resources = await MasterResource.aggregate(pipeline);

			if (resources) return resources;

			return [];
		} catch (err) {
			console.log(
				"Error --> MasterResourceAggregation --> getMasterLessonFilter"
			);
			throw err;
		}
	}

	async getSubtopicResourceListByChapterId(chapterId) {
		try {
			let pipeline = [
				{
					$match: {
						chapterId: new ObjectId(chapterId),
					},
				},
				{
					$project: {
						_id: 1,
						isAll: 1,
						subTopics: 1,
						learningOutcomes: 1,
					},
				},
			];

			let subtopics = await MasterResource.aggregate(pipeline);

			if (subtopics) return subtopics;

			return [];
		} catch (err) {
			console.log(
				"Error --> MasterResourceAggregation --> getSubtopicResourceListByChapterId"
			);
			throw err;
		}
	}

	async generateResourcePlan(resourceId, filters = {}) {
		try {
			const levelFilter = [
				{
					$addFields: {
						resources: {
							$filter: {
								input: "$resources",
								as: "resource",
								cond: {
									$or: [
										{ $eq: ["$$resource.section", "questionbank"] },
										{ $eq: ["$$resource.section", "realworldscenarios"] },
										{ $eq: ["$$resource.section", "activities"] },
									],
								},
							},
						},
						additionalResources: {
							$filter: {
								input: "$additionalResources",
								as: "additionalResource",
								cond: {
									$or: [
										{ $eq: ["$$additionalResource.section", "questionbank"] },
										{
											$eq: [
												"$$additionalResource.section",
												"realworldscenarios",
											],
										},
										{ $eq: ["$$additionalResource.section", "activities"] },
									],
								},
							},
						},
					},
				},
				{
					$addFields: {
						resources: {
							$map: {
								input: "$resources",
								as: "resource",
								in: {
									$mergeObjects: [
										"$$resource",
										{
											data: {
												$filter: {
													input: {
														$map: {
															input: "$$resource.data",
															as: "dataItem",
															in: {
																$cond: {
																	if: {
																		$ifNull: ["$$dataItem.difficulty", false],
																	},
																	then: {
																		$cond: {
																			if: {
																				$in: [
																					"$$dataItem.difficulty",
																					filters.levels,
																				],
																			},
																			then: "$$dataItem",
																			else: null,
																		},
																	},
																	else: "$$dataItem",
																},
															},
														},
													},
													as: "filteredDataItem",
													cond: { $ne: ["$$filteredDataItem", null] },
												},
											},
										},
									],
								},
							},
						},
						additionalResources: {
							$map: {
								input: "$additionalResources",
								as: "additionalResource",
								in: {
									$mergeObjects: [
										"$$additionalResource",
										{
											data: {
												$filter: {
													input: {
														$map: {
															input: "$$additionalResource.data",
															as: "dataItem",
															in: {
																$cond: {
																	if: {
																		$ifNull: ["$$dataItem.difficulty", false],
																	},
																	then: {
																		$cond: {
																			if: {
																				$in: [
																					"$$dataItem.difficulty",
																					filters.levels,
																				],
																			},
																			then: "$$dataItem",
																			else: null,
																		},
																	},
																	else: "$$dataItem",
																},
															},
														},
													},
													as: "filteredDataItem",
													cond: { $ne: ["$$filteredDataItem", null] },
												},
											},
										},
									],
								},
							},
						},
					},
				},
			];

			let pipeline = [
				{
					$match: { _id: new ObjectId(resourceId) },
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
					$lookup:{
					  from: "masterlessons",
									localField: "lessonId",
									foreignField: "_id",
									as: "lesson",
					}
				  },
				  {
					$unwind:"$lesson"
				  },
				  {
					$addFields:{
					  videos:"$lesson.videos"
					}
				  },
				  {
					$project:{
					  lesson:0
					}
				  }
			];

			if (filters.levels?.length > 0) {
				pipeline = [...pipeline, ...levelFilter];
			}

			let resources = await MasterResource.aggregate(pipeline);

			if (resources?.length > 0) {
				return { success: true, data: resources };
			} else {
				return { success: false, data: null };
			}
		} catch (err) {
			console.log(
				"Error --> MasterResourceAggregarion --> generateResourcePlan",
				err
			);
			throw err;
		}
	}
}

const masterResourceAggregation = new MasterResourceAggregation();

module.exports = masterResourceAggregation;

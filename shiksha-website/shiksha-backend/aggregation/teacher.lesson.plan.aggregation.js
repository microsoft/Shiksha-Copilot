const TeacherLessonPlan = require("../models/teacher.lesson.plan.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { getStartDate, getNumMonths } = require("../helper/filter.helper");
const { sortSubTopicsArrayTeacher } = require("../helper/formatter")

class TeacherLessonPlanAggregation {
	_lessonLookupStage() {
		return {
			$lookup: {
				from: "masterlessons",
				let: { lessonId: "$lessonId" , isVideoSelected:"$isVideoSelected" },
				as: "lesson",
				pipeline: [
					{
						$match: {
							$expr: { $eq: ["$$lessonId", "$_id"] },
						},
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
						$project: {
							_id: 1,
							name: 1,
							class: 1,
							subject: 1,
							teachingModel: 1,
							instructionSet: 1,
							learningOutcomes: 1,
							checkList:1,
							isAll: 1,
							videos : {
										$cond: {
											if: { $eq: ["$$isVideoSelected", false] },
											then: [],  
											else: "$videos"  
										}
									},
							"chapter._id": 1,
							"chapter.topics": 1,
							"chapter.subTopics": 1,
							"chapter.board": 1,
							"chapter.medium": 1,
							"chapter.orderNumber": 1,
							"subjects.name":1,
							"subjects.sem":1,
							subTopics: 1,
						},
					},

				],
			},
		};
	}

	_resourceLookupStage() {
		return {
			$lookup: {
				from: "masterresources",
				let: { resourceId: "$resourceId" },
				as: "resource",
				pipeline: [
					{
						$match: {
							$expr: { $eq: ["$$resourceId", "$_id"] },
						},
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
						$project: {
							_id: 1,
							lessonName: 1,
							lessonId:1,
							medium: 1,
							class: 1,
							board: 1,
							subject: 1,
							checkList:1,
							learningOutcomes:1,
							isAll: 1,
							"chapter._id": 1,
							"chapter.topics": 1,
							"chapter.subTopics": 1,
							"chapter.board": 1,
							"chapter.medium": 1,
							"chapter.orderNumber": 1,
							"subjects.name":1,
							"subjects.sem":1,
							subTopics: 1,
						},
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
				],
			},
		};
	}

	async getLessonBasedOnTeacherAndFilters(teacherId, filters = null) {
		try {
			let pipeline = [
				{
					$match: {
						teacherId,
						isLesson: true,
					},
				},
				{
					$lookup: {
						from: "masterlessons",
						localField: "lessonId",
						foreignField: "_id",
						as: "lesson",
					},
				},
				{
					$match: filters,
				},
				{
					$unwind: {
						path: "$lesson",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$project: {
						lesson: 1,
					},
				},
			];

			let lessons = await TeacherLessonPlan.aggregate(pipeline);

			return lessons;
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanAggregation --> getLessonBasedOnTeacherAndFilters"
			);
			throw err;
		}
	}

	async getByTeacherAndPagination(teacherId, page, limit, filter, sort) {
		const { isGroupedSubTopics, ...cleanedFilter } = filter;
		try {
			let pipeline = [
				{
					$match: {
						teacherId: new ObjectId(teacherId),
					},
				},
				{
					$lookup: {
						from: "regeneratedlessonresources",
						localField: "lessonId",
						foreignField: "genContentId",
						as: "regenerated",
					},
				},
				{
					$unwind: {
					  path: "$regenerated",
					  preserveNullAndEmptyArrays: true 
					}
				},
				this._lessonLookupStage(),
				this._resourceLookupStage(),
				{
					$unwind: {
						path: "$lesson",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$unwind: {
						path: "$resource",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$addFields: {
						createdMonth: { $month: "$createdAt" },
					},
				},
				{
					$match: cleanedFilter ,
				},
			]
			if (isGroupedSubTopics) {
				pipeline.push(
					{
						$group: {
							_id: {
								topic: "$lesson.chapter.topics",
								subtopic: "$lesson.subTopics",
							},
							lessons: { $push: "$$ROOT" },
						},
					},
					{
						$group: {
							_id: "$_id.topic",
							subtopics: {
								$push: {
									subtopic: "$_id.subtopic",
									lessons: "$lessons",
									isAll: { $first: "$lessons.lesson.isAll" }
								},
							},
						},
					},
					{
						$project: {
							subtopics: {
								$map: {
									input: "$subtopics",
									as: "subtopic",
									in: {
										subtopic: "$$subtopic.subtopic",
										isAll: "$$subtopic.isAll",
										lessons: {
											$map: {
												input: "$$subtopic.lessons",
												as: "lesson",
												in: {
													name: "$$lesson.lesson.name",
													lessonId:"$$lesson.lesson._id",
													isAll:"$$lesson.lesson.isAll"
												},
											},
										},
									},
								},
							},
						},
					}
				);
			} else {
				pipeline.push({
					$project: {
						lesson: 1,
						resource: 1,
						resources: 1,
						isLesson: 1,
						isCompleted: 1,
						isGenerated: 1,
						status: 1,
						isLoGeneratedContent: 1,
						instructionSet: 1,
						_id: 1,
						createdAt: 1,
						updatedAt: 1,
						createdMonth: 1,
						learningOutcomes: 1,
						additionalResources: 1,
						regeneratedcreatedAt: "$regenerated.createdAt",
						regeneratedupdatedAt: "$regenerated.updatedAt",
						regeneratedVersion:"$regenerated._version",
						regeneratedId:"$regenerated._id"
					},
				});
			}
		
			pipeline.push({
				$facet: {
					data: [
						{ $sort: sort },
						{ $skip: (page - 1) * limit },
						{ $limit: limit },
					],
					totalCount: [{ $count: "count" }],
				},
			});
			
			let lessons = await TeacherLessonPlan.aggregate(pipeline);
			if (isGroupedSubTopics) {
				lessons[0].data.forEach((item) => {
					item.subtopics = sortSubTopicsArrayTeacher(item.subtopics);
				});
			}
			return lessons;
		} catch (err) {
			console.log(
				"Error--> TeacherLessonPlanAggregation, getByTeacherAndPagination",
				err
			);
			throw err;
		}
	}

	async getMonthlyCount(teacherId, filter) {
		try {
			const currentDate = new Date();
			const startDate = getStartDate(filter, currentDate);
			const numMonths = getNumMonths(filter);

			const pipeline = [
				{
					$match: {
						teacherId: new ObjectId(teacherId),
						isCompleted:true,
						createdAt: { $gte: startDate },
					},
				},
				{
					$group: {
						_id: {
							month: { $month: "$createdAt" },
							year: { $year: "$createdAt" },
						},
						lessonCount: {
							$sum: { $cond: [{ $eq: ["$isLesson", true] }, 1, 0] },
						},
						resourceCount: {
							$sum: { $cond: [{ $eq: ["$isLesson", false] }, 1, 0] },
						},
					},
				},
				{
					$sort: { "_id.year": 1, "_id.month": 1 },
				},
			];

			const results = await TeacherLessonPlan.aggregate(pipeline);

			const months = [];
			for (let i = 0; i < numMonths; i++) {
				const date = new Date(
					startDate.getFullYear(),
					startDate.getMonth() + i,
					1
				);
				const monthName = date.toLocaleString("default", { month: "short" });
				months.push(`${monthName} ${date.getFullYear()}`);
			}

			const lessonPlanCounts = Array(numMonths).fill(0);
			const resourcePlanCounts = Array(numMonths).fill(0);

			results.forEach((result) => {
				const monthIndex = months.findIndex(
					(month) =>
						month ===
						`${new Date(result._id.year, result._id.month - 1).toLocaleString(
							"default",
							{ month: "short" }
						)} ${result._id.year}`
				);
				if (monthIndex !== -1) {
					lessonPlanCounts[monthIndex] = result.lessonCount;
					resourcePlanCounts[monthIndex] = result.resourceCount;
				}
			});

			return {
				timeLine: months,
				lessonPlanCounts,
				resourcePlanCounts,
			};
		} catch (error) {
			console.error("Error fetching monthly counts:", error);
			throw error;
		}
	}

	async getLessonPlanById(teacherId, lessonPlanId) {
		try {
			const pipeline = [
				{
					$match: {
						teacherId: new ObjectId(teacherId),
						lessonId: new ObjectId(lessonPlanId),
						isLesson: true,
					},
				},
				this._lessonLookupStage(),
				{
					$lookup: {
						from: "lessonfeedbacks",
						let: { lessonId: "$lessonId" },
						as: "feedback",
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ["$lessonId", "$$lessonId"] },
											{ $eq: ["$teacherId", new ObjectId(teacherId)] },
										],
									},
								},
							},
							{
								$project: {
									feedback: 1,
									overallFeedbackReason: 1,
									assessment: 1,
									feedbackPerSets: 1,
									createdAt: 1,
									updatedAt: 1,
								},
							},
						],
					},
				},
				{
					$unwind: {
						path: "$lesson",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$unwind: {
						path: "$feedback",
						preserveNullAndEmptyArrays: true,
					},
				},
			];

			const lessonPlan = await TeacherLessonPlan.aggregate(pipeline);
			return lessonPlan.length ? lessonPlan[0] : null;
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanAggregation --> getLessonPlanById",
				err
			);
			throw err;
		}
	}

	async getResourcePlanById(teacherId, resourcePlanId) {
		try {
			const pipeline = [
				{
					$match: {
						teacherId: new ObjectId(teacherId),
						resourceId: new ObjectId(resourcePlanId),
						isLesson: false,
					},
				},
				this._resourceLookupStage(),
				{
					$lookup: {
						from: "teacherresourcefeedbacks",
						let: { resourceId: "$resourceId" },
						as: "feedback",
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ["$teacherId", new ObjectId(teacherId)] },
											{ $eq: ["$resourceId", "$$resourceId"] },
										],
									},
								},
							},
							{
								$project: {
									feedback: 1,
									overallFeedbackReason: 1,
									feedbackPerSets: 1,
									createdAt: 1,
									updatedAt: 1,
								},
							},
						],
					},
				},
				{
					$unwind: {
						path: "$resource",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$unwind: {
						path: "$feedback",
						preserveNullAndEmptyArrays: true,
					},
				},
			];

			const resourcePlan = await TeacherLessonPlan.aggregate(pipeline);
			return resourcePlan.length ? resourcePlan[0] : null;
		} catch (err) {
			console.log(
				"Error --> TeacherLessonPlanAggregation --> getResourcePlanById",
				err
			);
			throw err;
		}
	}
}

const teacherLessonPlanAggregation = new TeacherLessonPlanAggregation();

module.exports = teacherLessonPlanAggregation;

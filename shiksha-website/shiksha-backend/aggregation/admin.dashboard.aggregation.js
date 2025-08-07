const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const User = require("../models/user.model");
const LessonChat = require("../models/lesson.chats.model");
const LessonFeedback = require("../models/feedback.lesson.model");
const { parseDate } = require("../helper/formatter")

class DashboardAggregation {

	_createHierarchicalMatchAndGroup(query) {
		let matchConditions = {};
		let groupByFields = {
			_id: {} ,
			lessonPlanCount: { $sum: 1 },
		};
	
		if (query.schoolId) {
			matchConditions.school = new ObjectId(query.schoolId);
			groupByFields._id = "$_id";
			groupByFields.name = { $first: "$name" }; 
		}
		else {

		groupByFields._id.state = "$state";
	
		if (query.state) {
			matchConditions.state = query.state;
			groupByFields._id.zone = "$zone"
	
			if (query.zone) {
				matchConditions.zone = query.zone;
				groupByFields._id.district = "$district";
	
				if (query.district) {
					matchConditions.district = query.district;
					groupByFields._id.block = "$block";
	
					if (query.block) {
						matchConditions.block = query.block;
						groupByFields._id.school = "$school";
						groupByFields.schoolName= { $first: "$schoolDetails.name" }
					}
				}
			}
		}
	}
		return { matchConditions, groupByFields };
	}
	

	async getDashboardMetrics(query) {
		let filterPipeline = [];
        const { matchConditions, groupByFields } = this._createHierarchicalMatchAndGroup(query);
        if (Object.keys(matchConditions).length > 0) {
            filterPipeline.push({ $match: matchConditions });
        }

		let masterData = [	{
			$lookup: {
				from: "masterlessons",
				localField: "lessonPlans.lessonId",
				foreignField: "_id",
				as: "lessonDetails",
			},
		},];

		if(!query.isLesson)
		{
			masterData = [	{
				$lookup: {
					from: "masterresources",
					localField: "lessonPlans.resourceId",
					foreignField: "_id",
					as: "lessonDetails",
				},
			},]
		}
		let dateFilter = {};
		if (query.fromDate || query.toDate) {
			dateFilter = {
				$match: {
					"lessonPlans.createdAt": {
						...(query.fromDate ? { $gte: parseDate(query.fromDate, true) } : {}),
                		...(query.toDate ? { $lte: parseDate(query.toDate, false) } : {}),
					}
				}
			};
		}
		try {
			const userCountsPipeline = [
				{
				  $facet: {
					counts: [
					  {
						$group: {
						  _id: null,
						  activeCount: {
							$sum: {
							  $cond: [{ $eq: ["$isDeleted", false] }, 1, 0],
							},
						  },
						  inactiveCount: {
							$sum: {
							  $cond: [{ $eq: ["$isDeleted", true] }, 1, 0],
							},
						  },
						},
					  },
					  {
						$project: {
						  _id: 0,
						  activeUsers: "$activeCount",
						  inactiveUsers: "$inactiveCount",
						},
					  },
					],
					allUsers: [
					  {
						$project: {
						  _id: 1,
						  name: 1,
						  isDeleted: 1,
						  role: 1,
						},
					  },
					  {
						$sort: { name: 1 },
					  },
					  {
						$limit: 3,
					  },
					],
					activeUsers: [
					  {
						$match: { isDeleted: false },
					  },
					  {
						$project: {
						  _id: 1,
						  name: 1,
						},
					  },
					  {
						$sort: { name: 1 },
					  },
					  {
						$limit: 3,
					  },
					],
					inactiveUsers: [
					  {
						$match: { isDeleted: true },
					  },
					  {
						$project: {
						  _id: 1,
						  name: 1,
						},
					  },
					  {
						$sort: { name: 1 },
					  },
					  {
						$limit: 3,
					  },
					],
				  },
				},
				{
				  $project: {
					allUsers: 1,
					activeUsers: 1,
					inactiveUsers: 1,
					userCounts: {
						$ifNull: [{ $arrayElemAt: ["$counts", 0] }, { activeUsers: 0, inactiveUsers: 0 }]
					  }
				  },
				},
			  ];

			const userMediumsPipeline = [
				{
				  $unwind: {
					path: "$classes",
					preserveNullAndEmptyArrays: true,
				  },
				},
				{
				  $group: {
					_id: {
					  medium: "$classes.medium",
					  userId: "$_id",
					},
					user: { $first: "$$ROOT" },
				  },
				},
				{
				  $group: {
					_id: "$_id.medium",
					users: { $addToSet: "$user" },
				  },
				},
				{
				  $match: {
					_id: { $ne: null }
				  },
				},
				{
				  $project: {
					medium: "$_id",
					users: {
					  $slice: [
						{
						  $map: {
							input: "$users",
							as: "user",
							in: {
							  _id: "$$user._id",
							  name: "$$user.name",
							  isDeleted: "$$user.isDeleted",
							  role: "$$user.role",
							},
						  },
						},
						3 // Limit the number of users to 3
					  ],
					},
					_id: 0,
				  },
				},
			  ];
				  
			const lessonPlanCount = [
				...filterPipeline,
				{
					$lookup: {
						from: "teacherlessonplans",
						localField: "_id",
						foreignField: "teacherId",
						as: "lessonPlans",
					},
				},
				{
					$unwind: {
						path: "$lessonPlans",
						preserveNullAndEmptyArrays: true,
					},
				},
				...Object.keys(dateFilter).length > 0 ? [dateFilter] : [],
				{
					$match: {
						"lessonPlans.isLesson": query.isLesson,
						"lessonPlans.isCompleted":true
					},
				},
				{
					$lookup: {
					  from: "schools",
					  localField: "school", 
					  foreignField: "_id",
					  as: "schoolDetails",
					},
				  },
				  {
					$unwind: {
					  path: "$schoolDetails",
					  preserveNullAndEmptyArrays: true, 
					},
				  },
				{
					$group: groupByFields
				},
				{
					$project: {
						_id: 0,
						lessonPlanCount: 1,
						name: {
							$ifNull: [
								"$name",
								{
									$ifNull: [
										"$schoolName", 
										{
											$ifNull: [
												"$_id.block", 
												{
													$ifNull: [
														"$_id.district", 
														{
															$ifNull: [
																"$_id.zone",
																"$_id.state"
															]
														}
													]
												}
											]
										}
									]
								}
							]
						}
					}
				},				
				{
					$sort: {
						state: 1,
						zone: 1,
						district: 1,
						block: 1,
						school: 1,
						name: 1,
					},
				},
			];

			const lessonPlanCountBySubject = [
				...filterPipeline,
				{
					$lookup: {
						from: "teacherlessonplans",
						localField: "_id",
						foreignField: "teacherId",
						as: "lessonPlans",
					},
				},
				{
					$unwind: {
						path: "$lessonPlans",
						preserveNullAndEmptyArrays: true,
					},
				},
				...Object.keys(dateFilter).length > 0 ? [dateFilter] : [],
				{
					$match: {
						"lessonPlans.isLesson": query.isLesson,
						"lessonPlans.isCompleted":true
					},
				},
				...masterData,
				{
					$unwind: {
						path: "$lessonDetails",
						preserveNullAndEmptyArrays: true,
					},
				},
				
				{
					$group: {
						_id: "$lessonDetails.subject",
						count: { $sum: 1 },
					},
				},
				{
					$lookup: {
					  from: 'mastersubjects', 
					  localField: '_id', 
					  foreignField: 'subjectName', 
					  as: 'subjectDetails'
					}
				},
				{
					$unwind: {
					  path: '$subjectDetails', 
					  preserveNullAndEmptyArrays: true
					}
				}, 
				{
					$project: {
					  _id: 0, 
					  subject: '$subjectDetails', 
					  lessonPlanCount: '$count'
					}
				}, 
				{
					$sort: {
					  'subject.subjectName': 1
					}
				}
			];

			const lessonPlanCountByMedium = [
				...filterPipeline,
				{
					$lookup: {
						from: "teacherlessonplans",
						localField: "_id",
						foreignField: "teacherId",
						as: "lessonPlans",
					},
				},
				{
					$unwind: {
						path: "$lessonPlans",
						preserveNullAndEmptyArrays: true,
					},
				},
				...Object.keys(dateFilter).length > 0 ? [dateFilter] : [],
				{
					$match: {
						"lessonPlans.isLesson":query.isLesson,
						"lessonPlans.isCompleted":true
					},
				},
				...masterData,
				{
					$unwind: {
						path: "$lessonDetails",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$group: {
						_id: "$lessonDetails.medium",
						count: { $sum: 1 },
					},
				},
				{
					$project: {
						_id: 0,
						medium: "$_id",
						lessonPlanCount: "$count",
					},
				},
			];

			const feedbackCountBySubject = [
				{
					$lookup: {
						from: "users",
						localField: "teacherId",
						foreignField: "_id",
						as: "teacher",
					},
				},
				{
					$unwind: {
						path: "$teacher",
						preserveNullAndEmptyArrays: false,
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
					$unwind: {
						path: "$lesson",
						preserveNullAndEmptyArrays: false,
					},
				},
				{
					$group: {
						_id: "$feedback",
						count: {
							$sum: 1,
						},
					},
				},
			];

			const months = [];
			const today = new Date();
			for (let i = 5; i >= 0; i--) {
				const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
				months.push({
					month: date.toISOString().substr(0, 7),
					requestCount: 0,
				});
			}
			
			const requestCountPipeline = [
				{
					$lookup: {
						from: "chats",
						localField: "_id",
						foreignField: "userId",
						as: "chatRequests",
					},
				},
				{
					$unwind: {
						path: "$chatRequests",
						preserveNullAndEmptyArrays: true,
					},
				},
				{
					$match: {
						"chatRequests.createdAt": {
							$gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
							$lt: new Date(),
						},
					},
				},
				{
					$addFields: {
						yearMonth: {
							$dateToString: { format: "%Y-%m", date: "$chatRequests.createdAt" },
						},
					},
				},
				{
					$group: {
						_id: "$yearMonth",
						requestCount: { $sum: "$chatRequests.requestCount" },
					},
				},
				{
					$sort: {
						_id: 1,
					},
				},
				{
					$project: {
						_id: 0,
						month: "$_id",
						requestCount: 1,
					},
				},
				{
					$group: {
						_id: null,
						data: { $push: "$$ROOT" },
					},
				},
				{
					$project: {
						_id: 0,
						data: {
							$concatArrays: ["$data", months],
						},
					},
				},
				{
					$unwind: "$data",
				},
				{
					$group: {
						_id: "$data.month",
						requestCount: { $sum: "$data.requestCount" },
					},
				},
				{
					$sort: { _id: 1 },
				},
				{
					$project: {
						_id: 0,
						month: "$_id",
						requestCount: 1,
					},
				},
			];

			const lessonChatCountPipeline = [
				{
				  $match: {
					createdAt: {
					  $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
					  $lt: new Date(),
					},
				  },
				},
				{
				  $addFields: {
					yearMonth: {
					  $dateToString: {
						format: "%Y-%m",
						date: "$createdAt",
					  },
					},
				  },
				},
				{
				  $group: {
					_id: "$yearMonth",
					requestCount: {
					  $sum: 1,
					},
				  },
				},
				{
				  $sort: {
					_id: 1,
				  },
				},
				{
				  $project: {
					_id: 0,
					month: "$_id",
					requestCount: 1,
				  },
				},
				{
				  $group: {
					_id: null,
					data: { $push: "$$ROOT" },
				  },
				},
				{
				  $project: {
					_id: 0,
					data: {
					  $concatArrays: ["$data", months],
					},
				  },
				},
				{
				  $unwind: "$data",
				},
				{
				  $group: {
					_id: "$data.month",
					requestCount: { $sum: "$data.requestCount" },
				  },
				},
				{
				  $sort: { _id: 1 },
				},
				{
				  $project: {
					_id: 0,
					month: "$_id",
					requestCount: 1,
				  },
				},
			  ];			  

			const [
				userMetrics,
				userMediumMetrics,
				userLessonPlanCount,
				subjectLessonPlanCount,
				mediumLessonPlanCount,
				feedbackCountResult,
				botRequestCount,
				lessonChatCount
			] = await Promise.all([
				User.aggregate(userCountsPipeline),
				User.aggregate(userMediumsPipeline),
				User.aggregate(lessonPlanCount),
				User.aggregate(lessonPlanCountBySubject),
				User.aggregate(lessonPlanCountByMedium),
				LessonFeedback.aggregate(feedbackCountBySubject),
				User.aggregate(requestCountPipeline),
				LessonChat.aggregate(lessonChatCountPipeline)
			]);
	
			return {
				success: true,
				userCounts: userMetrics[0],
				userMediums: userMediumMetrics,
				lessonPlanCount: userLessonPlanCount,
				lessonPlanCountBySubject: subjectLessonPlanCount,
				lessonPlanCountByMedium: mediumLessonPlanCount,
				feedbackCount: feedbackCountResult,
				botRequestCount: botRequestCount,
				lessonbotRequestCount:lessonChatCount
			};
		
		} catch (err) {
			console.log("Error --> DashboardAggregation --> getDashboardMetrics");
			throw err;
		}
	}
}

const dashboardAggregation = new DashboardAggregation();

module.exports = dashboardAggregation;

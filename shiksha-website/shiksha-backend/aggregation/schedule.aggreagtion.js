const Schedule = require("../models/schedule.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const User = require("../models/user.model");

class ScheduleAggregation {
	async getScheduleById(scheduleId) {
		try 
		{
			const pipeline = [
			{
				$match: {
					_id: new ObjectId(scheduleId),
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
				$unwind: "$lesson",
			},
			{
				$lookup: {
					from: "chapters",
					localField: "lesson.chapterId",
					foreignField: "_id",
					as: "lesson.chapter",
				},
			},
			{
				$unwind: {
					path: "$lesson.chapter",
					preserveNullAndEmptyArrays: true 
				}
			},
			{
				$lookup: {
					from: "mastersubjects",
					localField: "lesson.chapter.subjectId",
					foreignField: "_id",
					as: "lesson.subjects",
				},
			},
			{
				$unwind: {
					path: "$lesson.subjects",
					preserveNullAndEmptyArrays: true 
				}
			},
			{
				$project: {
					_id: 1,
					subject: 1,
					medium: 1,
					board: 1,
					section: 1,
					createdAt: 1,
					teacherId: 1,
					scheduleType: 1,
					isDeleted: 1,
					topic: 1,
					subTopic: 1,
					scheduleDateTime: 1,
					__v: 1,
					class: 1,
					otherClass: 1,
					updatedAt: 1,
					"lesson.name": 1,
					"lesson._id": 1,
					"lesson.chapter._id": 1,
					"lesson.chapter.topics":1,
					"lesson.chapter.orderNumber": 1,
					"lesson.subjects.name":1,
					"lesson.subjects.sem":1
				},
			},
		];

			let schedule = await Schedule.aggregate(pipeline);

			return schedule;
		} catch (err) {
			console.log("Error --> ScheduleAggregation --> getScheduleById()", err);
			throw err;
		}
	}

	async getAllSchedulesBasedOnTeacherId(teacherId) {
		try {
			let pipeline = [
				[
					{
						$match: {
							teacherId: new ObjectId(teacherId),
						},
					},
				],
			];

			let schedules = await Schedule.aggregate(pipeline);

			if (schedules) return schedules;

			return [];
		} catch (err) {
			console.log(
				"Error --> ScheduleAggregation --> getAllSchedulesBasedOnTeacherId"
			);
			throw err;
		}
	}

	async getBySchool(schoolId, teacherClasses, fromDate, toDate, teacherId, teacherSchedule) {
		try {
			let getactiveUserSchedules = {
        		school: schoolId,
        		isDeleted: false,
      		};

      		const activeTeachers = await User.find(getactiveUserSchedules);
      		const activeTeacherIds = activeTeachers.map((teacher) => teacher._id);

			let match = {
				schoolId,
				class: {
					$in: teacherClasses,
				},
				isDeleted: false,
			};

			if (fromDate && toDate) {
				match = {
					...match,
					"scheduleDateTime.date": {
						$gte: new Date(fromDate),
						$lte: new Date(toDate),
					},
				};
			}

		
			if (teacherSchedule) {
				if (teacherSchedule === "true") {
					match.teacherId = teacherId;
				} else if (teacherSchedule === "false") {
					match.teacherId = { $in: activeTeacherIds.filter(id => !id.equals(teacherId)) };
				}
			}

			let pipeline = [
				{
					$match: match,
				},
				{
					$lookup: {
						from: "masterlessons",
						let: {
							lessonId: "$lessonId",
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: ["$_id", "$$lessonId"],
									},
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
									"subjects.name":1,
									"subjects.sem":1,
					
								},
							},
						],
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
					$lookup: {
						from: "users",
						let: {
							teacherId: "$teacherId",
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: ["$_id", "$$teacherId"],
									},
								},
							},
							{
								$project: {
									_id: 1,
									name: 1,
									role: 1,
									profileImage: 1,
								},
							},
						],
						as: "teacher",
					},
				},
				{
					$unwind: {
						path: "$teacher",
						preserveNullAndEmptyArrays: false,
					},
				},
			];

			let schedules = await Schedule.aggregate(pipeline);

			if (schedules) return schedules;

			return [];
		} catch (err) {
			console.log("Error --> ScheduleAggregation --> getBySchool");
			throw err;
		}
	}

	async getMySchedules(teacherId, date) {
		try {
			let match = {
				teacherId,
				isDeleted: false,
			};

			if (date) {
				match = {
					...match,
					"scheduleDateTime.date": {
						$eq: new Date(date),
					},
				};
			}

			let pipeline = [
        {
          $match: match,
        },
        {
          $lookup: {
            from: "users",
            localField: "teacherId",
            foreignField: "_id",
            as: "teacher",
          },
        },
        {
          $lookup: {
            from: "mastersubjects",
            localField: "subject",
            foreignField: "subjectName",
            as: "subjects",
          },
        },
        {
          $unwind: {
            path: "$subjects",
          },
        },
      ];

			let schedules = await Schedule.aggregate(pipeline);

			if (schedules) return schedules;

			return [];
		} catch (err) {
			console.log("Error --> ScheduleAggregation --> getMySchedules");
			throw err;
		}
	}

	async getParallelSchedules(
		schoolId,
		teacherClass,
		board,
		medium,
		teacherId,
		scheduleDateTime,
		scheduleId
	) {

		try {

			let pipelineClass = [
				{
					$match: {
						schoolId,
						class: teacherClass,
						board,
						medium,
						isDeleted: false,
					},
				},
			];

			let pipelineTeacher = [
				{
					$match: {
						schoolId,
						teacherId,
						board,
						medium,
						isDeleted: false,
					},
				}, 
			];

			if (scheduleId) {
				pipelineClass[0].$match._id = { $ne: new ObjectId(scheduleId) };
				pipelineTeacher[0].$match._id= { $ne:new ObjectId(scheduleId) };
			}

			let pipeline = [
				{ $unwind: "$scheduleDateTime" },
				{
					$match: {
					  $expr: {
						$or: scheduleDateTime.map(schedule => ({
						  $or: [
							// Case where the schedule overlaps at the start
							{
							  $and: [
								{ $lt: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.toTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.fromTime", ":00Z"] } } }] },
								{ $gte: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.fromTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.fromTime", ":00Z"] } } }] }
							  ]
							},
							// Case where the schedule overlaps at the end
							{
							  $and: [
								{ $lt: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.toTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.toTime", ":00Z"] } } }] },
								{ $gte: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.fromTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.fromTime", ":00Z"] } } }] }
							  ]
							},
							// Case where the schedule is fully within another schedule
							{
							  $and: [
								{ $gte: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.fromTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.fromTime", ":00Z"] } } }] },
								{ $lte: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.toTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.toTime", ":00Z"] } } }] }
							  ]
							},
							// Case where the schedule covers the entire period
							{
							  $and: [
								{ $lte: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.fromTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.fromTime", ":00Z"] } } }] },
								{ $gte: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.toTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.toTime", ":00Z"] } } }] }
							  ]
							},
							// New condition: Overlapping where the new schedule is within the existing schedule
							{
							  $and: [
								{ $lt: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.fromTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.toTime", ":00Z"] } } }] },
								{ $gt: [{ $dateFromString: { dateString: { $concat: [schedule.date, "T", schedule.toTime, ":00Z"] } } }, { $dateFromString: { dateString: { $concat: [{ $dateToString: { format: "%Y-%m-%d", date: "$scheduleDateTime.date", timezone: "UTC" } }, "T", "$scheduleDateTime.fromTime", ":00Z"] } } }] }
							  ]
							}
						  ]
						}))
					  }
					}
				  }
				
			];

			let classSchedule = await Schedule.aggregate([...pipelineClass,...pipeline]);
			let teacherSchedule = await Schedule.aggregate([...pipelineTeacher,...pipeline]);

	
			if (teacherSchedule.length > 0) {
				return {
					canSchedule: false,
					message: "The teacher already has a class scheduled at this time."
				};
			} else if (classSchedule.length > 0) {
				return {
					canSchedule: false,
					message: "A class is scheduled at this time."
				};
			} else {
				return {
					canSchedule: true,
					message: "No conflicts found for scheduling.",

				};
			}
		} catch (err) {
			console.log(
				"Error --> ScheduleAggregation --> getParallelSchedules",
				err
			);
		}
	}
}

const scheduleAggregation = new ScheduleAggregation();

module.exports = scheduleAggregation;

const scheduleAggregation = require("../aggregation/schedule.aggreagtion");
const Schedule = require("../models/schedule.model");
const BaseDao = require("./base.dao");

class ScheduleDao extends BaseDao {
	constructor() {
		super(Schedule);
	}

	async getById(id) {
		try {
			let result = await scheduleAggregation.getScheduleById(id);
			if (result.length > 0) {
				return result[0];
			}
			return false;
		} catch (err) {
			console.log("Error --> ScheduleDao -> getById()", err);
			throw err;
		}
	}

	async update(id, updates, session = null) {
		try {
			const result = await Schedule.findOneAndUpdate(
				{
					_id: id,
					isDeleted: false,
				},
				{
					$set: updates,
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> SchoolDao -> update", err);
			throw err;
		}
	}

	async getAllSchedulesBasedOnTeacherId(teacherId) {
		try {
			const schedules =
				await scheduleAggregation.getAllSchedulesBasedOnTeacherId(teacherId);
			return schedules;
		} catch (err) {
			console.log(
				"Error -> ScheduleDao -> getAllSchedulesBasedOnTeacherId",
				err
			);
			throw err;
		}
	}

	async getBySchool(schoolId, teacherClasses, fromDate, toDate , teacherId, teacherSchedule) {
		try {
			const schedules = await scheduleAggregation.getBySchool(
				schoolId,
				teacherClasses,
				fromDate,
				toDate,
				teacherId,
				teacherSchedule
			);
			return schedules;
		} catch (err) {
			console.log("Error -> ScheduleDao -> getBySchool", err);
			throw err;
		}
	}

	async getMySchedules(teacherId, date) {
		try {
			const schedules = await scheduleAggregation.getMySchedules(
				teacherId,
				date
			);
			return schedules;
		} catch (err) {
			console.log("Error -> ScheduleDao -> getMySchedules", err);
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
			const schedules = await scheduleAggregation.getParallelSchedules(
				schoolId,
				teacherClass,
				board,
				medium,
				teacherId,
				scheduleDateTime,
				scheduleId
			);
			return schedules;
		} catch (err) {
			console.log("Error -> ScheduleDao -> getParallelSchedules", err);
			throw err;
		}
	}

	async deleteDateTime(scheduleId, timeId, session = null) {
		try {
			const result = await Schedule.findByIdAndUpdate(
				scheduleId,
				{
					$pull: {
						scheduleDateTime: {
							_id: timeId,
						},
					},
				},
				{
					new: true,
					runValidators: true,
					session: session,
				}
			);
			return result;
		} catch (err) {
			console.log("Error -> BaseDao -> delete", err);
		}
	}
}

module.exports = ScheduleDao;

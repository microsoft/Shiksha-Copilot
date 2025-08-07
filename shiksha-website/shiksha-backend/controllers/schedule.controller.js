const handleError = require("../helper/handleError");
const formatApiReponse = require("../helper/response");
const ScheduleManager = require("../managers/schedule.manager");
const BaseController = require("./base.controller");

class ScheduleController extends BaseController {
	constructor() {
		super(new ScheduleManager());
		this.scheduleManager = new ScheduleManager();
	}

	async update(req, res) {
		try {
			const { _id } = req.body;

			req.body._id = undefined;

			const result = await this.scheduleManager.update(
				_id,
				req.body,
				req.user,
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
		} catch (err) {
			console.log("Error --> ScheduleController -> update()", err);
			return formatApiReponse(false, err?.message, err);
		}
	}

	async getAllSchedulesBasedOnTeacherId(req, res) {
		try {
			const { teacherId } = req.params;

			const result = await this.scheduleManager.getAllSchedulesBasedOnTeacherId(
				teacherId
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
		} catch (err) {
			console.log(
				"Error --> ScheduleController -> getAllSchedulesBasedOnTeacherId()",
				err
			);
			return formatApiReponse(false, err?.message, err);
		}
	}

	async getBySchool(req, res) {
		try {
			const { fromDate, toDate, teacherClass ,teacherSchedule } = req.query;

			const result = await this.scheduleManager.getBySchool(
				req.user,
				fromDate,
				toDate,
				teacherClass,
				teacherSchedule
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
		} catch (err) {
			console.log("Error --> ScheduleController -> getBySchool()", err);
			return formatApiReponse(false, err?.message, err);
		}
	}

	async getMySchedules(req, res) {
		try {
			const { date } = req.query;

			const result = await this.scheduleManager.getMySchedules(
				req.user._id,
				date
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
		} catch (err) {
			console.log("Error --> ScheduleController -> getMySchedules()", err);
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = ScheduleController;

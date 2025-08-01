const handleError = require("../helper/handleError.js");
const SchoolManager = require("../managers/school.manager.js");
const BaseController = require("./base.controller.js");
const dbService = require("../config/db");

class SchoolController extends BaseController {
	constructor() {
		super(new SchoolManager());
		this.schoolManager = new SchoolManager();
	}

	async create(req, res) {
		try {
			let db = await dbService.getConnection();
			const session = await db.startSession();

			let result = await this.schoolManager.create(req, session);

			await session.endSession();

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> create()", err);
			return res.status(400).json(err);
		}
	}

	async update(req, res) {
		try {
			const { id } = req.params;
			let result = await this.schoolManager.update(id, req.body);

			if (result.success) {
				return res.status(200).json(result);
			}
			handleError(result, res);
			return;
		} catch (err) {
			console.log("Error --> SchoolController -> update()", err);
			return res.status(400).json(err);
		}
	}

	async updateFacility(req, res) {
		try {
			const { id } = req.params;
			let result = await this.schoolManager.updateFacility(id, req.body);

			if (result.success) {
				return res.status(200).json(result);
			}
			handleError(result, res);
			return;
		} catch (err) {
			console.log("Error --> SchoolController -> updateFacility()", err);
			return res.status(400).json(err);
		}
	}

	async bulkUpload(req, res) {
		try {
			const userId = req.user._id;
			const userName = req.user.name;
			if (!req.file) {
				return res.status(400).json({ error: "File not provided" });
			}
			const result = await this.schoolManager.bulkUpload(req.file.buffer ,userId.toString(), userName);
			if (result.success)
			return res.status(200).json({
			  message: "Bulk upload initiated , Please verify for audit logs!",
			});

			handleError(result, res);
		} catch (err) {
			console.log("Error --> SchoolController -> bulkUpload()", err);
			return res.status(400).json(err);
		}
	}

	async export(req,res){
		try {
      const result = await this.schoolManager.exportSchool(req);
      if (result.success) {
        return res.status(200).json(result);
      }

      handleError(result, res);
    } catch (err) {
      console.log("Error --> SchoolController -> exportSchool()", err);
      return res.status(400).json(err);
    }
	}
}

module.exports = SchoolController;

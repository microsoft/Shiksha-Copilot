const handleError = require("../helper/handleError.js");
const AdminUserManager = require("../managers/admin.user.manager.js");
const BaseController = require("./base.controller.js");

class AdminUserController extends BaseController {
	constructor() {
		super(new AdminUserManager());
		this.adminUserManager = new AdminUserManager();
	}

	async getByPhone(req, res) {
		try {
			let result = await this.adminUserManager.getByPhone(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> AdminUserController -> getByPhone()", err);
			return res.status(400).json(err);
		}
	}

	async update(req, res) {
		try {
			const { _id } = req.body;
			let result = await this.adminUserManager.update(_id, req.body);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> AdminUserController -> update()", err);
			return res.status(400).json(err);
		}
	}

	async bulkUpload(req, res) {
		try {
			if (!req.file) {
				return res.status(400).json({ error: "File not provided" });
			}
			const result = await this.adminUserManager.bulkUpload(req.file.buffer);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
		} catch (err) {
			console.log("Error --> AdminUserController -> bulkUpload()", err);
			return res.status(400).json(err);
		}
	}

	async getContentActivity(req, res) {
		try {
			const {
				page = 1,
				limit = 10,
				filter = {},
				sortBy = "createdAt",
				sortOrder = "desc",
				search = "",
			} = req.query;

			const sortOrderObject =
				sortOrder === "desc" ? { [sortBy]: -1 } : { [sortBy]: 1 };

			const searchFilter = {};

			if (search) {
				const searchFields = [
					"user.name",
					"user.school.name",
					"content.name",
					"content.topics",
				];

				const regexExpressions = searchFields.map((field) => ({
					[field]: { $regex: new RegExp(search, "i") },
				}));

				searchFilter.$or = regexExpressions;
			}

			let result = await this.adminUserManager.getContentActivity(
				parseInt(page),
				parseInt(limit),
				{ ...filter, ...searchFilter },
				sortOrderObject
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> AdminUserController -> getContentActivity()", err);
			return res.status(400).json(err);
		}
	}

	async exportContentActivity(req, res) {
		try {
		  const result = await this.adminUserManager.exportContentActivity(req);
		  if (result.success) return res.status(200).json(result);
	
		  handleError(result, res);
		} catch (err) {
		  return res.status(400).json(err);
		}
	  }

	async getDashboardMetrics(req, res) {
		try {
			const { state, zone, block, district, schoolId ,fromDate , toDate , isLesson } = req.query;
        
			const filters = {
				state,
				zone,
				block,
				district,
				schoolId,
				fromDate,
				toDate,
				isLesson: isLesson === 'true' ? true : isLesson === 'false' ? false : undefined
			};
			let result = await this.adminUserManager.getDashboardMetrics(filters);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
		} catch (err) {
			console.log(
				"Error --> AdminUserController -> getDashboardMetrics()",
				err
			);
			return res.status(400).json(err);
		}
	}
}

module.exports = AdminUserController;

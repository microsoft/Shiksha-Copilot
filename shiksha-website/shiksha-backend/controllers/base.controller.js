const handleError = require("../helper/handleError");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class BaseController {
	constructor(manager) {
		this.manager = manager;
	}

	async getAll(req, res) {
		try {
			const {
				page = 1,
				limit,
				filter = {},
				sortBy = "createdAt",
				sortOrder = "desc",
				search,
				includeDeleted,
			} = req.query;
			const sortOrderObject =
				sortOrder === "desc" ? { [sortBy]: -1 } : { [sortBy]: 1 };

			const searchFilter = {};

			if (search) {
				const searchFields = ["name", "phone"];

				const regexExpressions = searchFields.map((field) => ({
					[field]: { $regex: new RegExp(search, "i") },
				}));
				
				if (!isNaN(parseInt(search))) {
					regexExpressions.push({ schoolId: parseInt(search) });
				}

				searchFilter.$or = regexExpressions;
			}

			const transformedFilter = { ...filter };
			if (transformedFilter._id) {
				try {
					transformedFilter._id = new ObjectId(transformedFilter._id);
				} catch (err) {
					console.error("Invalid _id format:", transformedFilter._id);
					return res.status(400).json({ error: "Invalid _id format" });
				}
			}
			const mergedFilter = { ...transformedFilter, ...searchFilter };

			let status = {};

			if (includeDeleted === '2') {
				status = { isDeleted: true }; 
			} else if (includeDeleted === '0') {
				status = { isDeleted: false }; 
			}
			const result = await this.manager.getAll(
				parseInt(page),
				parseInt(limit),
				mergedFilter,
				sortOrderObject,
				status,
				req?.user?._id
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> getAll()", err);
			return res.status(400).json(err);
		}
	}

	async getById(req, res) {
		try {
			let result = await this.manager.getById(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> getById()", err);
			return res.status(400).json(err);
		}
	}

	async create(req, res) {
		try {
			let result = await this.manager.create(req);

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
			let result = await this.manager.update(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> update()", err);
		}
	}

	async delete(req, res) {
		try {
			let result = await this.manager.delete(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> delete()", err);
		}
	}

	async activate(req, res) {
		try {
			let result = await this.manager.activate(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> activate()", err);
		}
	}


	async deactivate(req, res) {
		try {
			let result = await this.manager.deactivate(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> deactivate()", err);
		}
	}
}


module.exports = BaseController;

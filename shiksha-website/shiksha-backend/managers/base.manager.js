const formatApiReponse = require("../helper/response");

require("dotenv").config();

class BaseManager {
	constructor(dao) {
		this.dao = dao;
	}

	async getAll(
		page = 1,
		limit,
		filters = {},
		sort = {},
		status,
		userId
	) {
		try {
			let data = await this.dao.getAll(
				page,
				limit,
				filters,
				sort,
				status,
				userId
			);
			return formatApiReponse(true, "", data);
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}

	async getById(req) {
		try {
			let data = await this.dao.getById(req.params.id);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "", data);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async create(req) {
		try {
			let data = await this.dao.create(req.body);
			return formatApiReponse(true, "success!", data);
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}

	async delete(req) {
		try {
			await this.dao.delete(req.params?.id);
			return formatApiReponse(true, "Deactivated successfully!", null);
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}

	async activate(req) {
		try {
			let data = await this.dao.activate(req.params.id);
			return formatApiReponse(true, "School is activated!", data);
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}
}


module.exports = BaseManager;

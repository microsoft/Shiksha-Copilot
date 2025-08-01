const FacilityDao = require("../dao/facility.dao");
const formatApiReponse = require("../helper/response");
const BaseManager = require("./base.manager");

class FacilityManager extends BaseManager {
	constructor() {
		super(new FacilityDao());
		this.resourceDao = new FacilityDao();
	}

	async update(req) {
		try {
			let data = await this.resourceDao.update(req.body);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "failed to update facilities", null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = FacilityManager;

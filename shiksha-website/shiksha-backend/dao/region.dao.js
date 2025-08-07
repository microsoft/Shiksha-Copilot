const Region = require("../models/region.model");
const BaseDao = require("./base.dao");

class RegionDao extends BaseDao {
	constructor() {
		super(Region);
	}
}

module.exports = RegionDao;

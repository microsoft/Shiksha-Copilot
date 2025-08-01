const RegionDao = require("../dao/region.dao");
const BaseManager = require("./base.manager");

class RegionManager extends BaseManager {
	constructor() {
		super(new RegionDao());
	}
}

module.exports = RegionManager;

const RegionManager = require("../managers/region.manager");
const BaseController = require("./base.controller");

class RegionController extends BaseController {
	constructor() {
		super(new RegionManager());
	}
}

module.exports = RegionController;

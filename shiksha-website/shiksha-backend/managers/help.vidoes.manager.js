const HelpVideosDao = require("../dao/help.videos.dao");
const BaseManager = require("./base.manager");

class HelpVideosManager extends BaseManager {
	constructor() {
		super(new HelpVideosDao());
	}
}

module.exports = HelpVideosManager;

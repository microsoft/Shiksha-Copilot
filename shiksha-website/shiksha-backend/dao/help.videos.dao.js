const HelpVideos = require("../models/help.videos.model.js");
const BaseDao = require("./base.dao.js");

class HelpVideosDao extends BaseDao {
	constructor() {
		super(HelpVideos);
	}
}

module.exports = HelpVideosDao;

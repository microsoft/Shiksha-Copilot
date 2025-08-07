const BaseManager = require("./base.manager");
const BoardDao = require("../dao/board.dao");
const formatApiReponse = require("../helper/response");

class BoardManager extends BaseManager {
	constructor() {
		super(new BoardDao());
		this.boardDao = new BoardDao();
	}

	async getByName(req) {
		try {
			let data = await this.boardDao.getByName(req.body?.name);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "", null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async update(req) {
		try {
			let data = await this.boardDao.update(req.body);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "", null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = BoardManager;

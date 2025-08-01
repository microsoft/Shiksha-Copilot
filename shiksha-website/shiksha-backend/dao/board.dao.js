const Board = require("../models/board.model.js");
const BaseDao = require("./base.dao.js");

class BoardDao extends BaseDao {
	constructor() {
		super(Board);
	}

	async getByName(name) {
		try {
			let board = await Board.findOne({ boardName: name, isDeleted: false });
			if (board) return board;
			return false;
		} catch (err) {
			console.log("Error -> BoardDao -> getByName", err);
			throw err;
		}
	}

	async getByAbbreviation(abbreviation) {
		try {
			let board = await Board.findOne({ abbreviation, isDeleted: false });
			if (board) return board;
			return false;
		} catch (err) {
			console.log("Error -> BoardDao -> getByName", err);
			throw err;
		}
	}

	async update(data, session = null) {
		try {
			const result = await Board.findOneAndUpdate(
				{
					_id: data?.id,
					isDeleted: false,
				},
				{
					$set: {
						boardName: data?.boardName,
						state: data?.state,
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> BoardDao -> update", err);
			throw err;
		}
	}
}

module.exports = BoardDao;

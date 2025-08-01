const MasterSubject = require("../models/master.subject.model.js");
const BaseDao = require("./base.dao.js");

class MasterSubjectDao extends BaseDao {
	constructor() {
		super(MasterSubject);
	}

	async getByNameAndBoard(subjectName, board) {
		try {
			let subject = await MasterSubject.findOne({
				subjectName: subjectName,
				boards: board,
			});

			return subject;
		} catch (err) {
			console.log("Error -> MasterSubjectDao -> getByNameAndBoard", err);
			throw err;
		}
	}

	async update(id, updates, session = null) {
		try {
			const result = await MasterSubject.findOneAndUpdate(
				{
					_id: id,
					isDeleted: false,
				},
				{
					$set: {
						subject: updates.subject,
						topics: updates.topics,
						boards: updates.boards,
						medium: updates.medium,
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> MasterSubjectDao -> update", err);
			throw err;
		}
	}
}

module.exports = MasterSubjectDao;

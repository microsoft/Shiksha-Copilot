const Subject = require("../models/subject.model.js");
const BaseDao = require("./base.dao.js");

class SubjectDao extends BaseDao {
	constructor() {
		super(Subject);
	}

	async update(id, updates, session = null) {
		try {
			const result = await Subject.findOneAndUpdate(
				{
					_id: id,
					isDeleted: false,
				},
				{
					$set: {
						subject: updates.subject,
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> SubjectDao -> update", err);
			throw err;
		}
	}
}

module.exports = SubjectDao;

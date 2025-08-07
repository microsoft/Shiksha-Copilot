const TeacherResourceFeedback = require("../models/feedback.resource.model");
const BaseDao = require("./base.dao.js");

class TeacherResourceFeedbackDao extends BaseDao {
	constructor() {
		super(TeacherResourceFeedback);
	}

	async update(id, updates, session = null) {
		try {
			const result = await TeacherResourceFeedback.findOneAndUpdate(
				{
					_id: id,
				},
				{
					$set: updates,
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> TeacherResourceFeedbackDao -> update", err);
			throw err;
		}
	}
}

module.exports = TeacherResourceFeedbackDao;
const School = require("../models/school.model.js");
const BaseDao = require("./base.dao.js");

class SchoolDao extends BaseDao {
	constructor() {
		super(School);
	}

	async getBySchoolId(data) {
		try {
			let result = await School.findOne({
				schoolId: data,
			});
			return result;
		} catch (err) {
			console.log("Error --> SchoolDao -> getBySchoolId()", err);
			throw err;
		}
	}

	async update(id, updates, session = null) {
		try {
			const result = await School.findOneAndUpdate(
				{
					_id: id,
					isDeleted: false,
				},
				{
					$set: updates,
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> SchoolDao -> update", err);
			throw err;
		}
	}
}

module.exports = SchoolDao;

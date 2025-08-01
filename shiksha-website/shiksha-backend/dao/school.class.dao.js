const classAggregation = require("../aggregation/school.class.aggregation.js");
const ClassModel = require("../models/school.class.model.js");
const BaseDao = require("./base.dao.js");

class ClassDao extends BaseDao {
	constructor() {
		super(ClassModel);
	}

	async update(id, updates, session = null) {
		try {
			const result = await ClassModel.findOneAndUpdate(
				{
					_id: id,
					isDeleted: false,
				},
				{
					$set: 
					{
						start : updates.start,
						end : updates.end
					}
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> ClassDao -> update", err);
			throw err;
		}
	}

	async getClassesBySchoolId(schoolId) {
		try {
			const classes = await classAggregation.getClassesBySchoolId(schoolId);
			return classes;
		} catch (err) {
			console.log("Error -> ClassDao -> getClassesBySchoolId", err);
			throw err;
		}
	}


	async updateOne(filter, updates, session = null) {
		try {
			const result = await ClassModel.updateOne(
				filter,
				updates,
				{ session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> ClassDao -> updateOne", err);
			throw err;
		}
	}

	async getGroupClassesByBoard(schoolId) {
		try {
			const classes = await classAggregation.getGroupClassesByBoard(schoolId);
			return classes;
		} catch (err) {
			console.log("Error -> ClassDao -> getGroupClassesByBoard", err);
			throw err;
		}
	}
}

module.exports = ClassDao;

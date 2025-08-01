const MasterClass = require("../models/master.class.model.js");
const BaseDao = require("./base.dao.js");

class MasterClassDao extends BaseDao {
	constructor() {
		super(MasterClass);
	}

	async getAll(page = 1, limit = 10, filters = {}, sort = {}) {
		try {
			const pipeline = [
				{ $match: filters },
				{
					$facet: {
						data: [
							{ $sort: sort },
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
						],
						totalCount: [{ $count: "count" }],
					},
				},
			];

			const results = await MasterClass.aggregate(pipeline).exec();

			const totalItems =
				results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

			return {
				page,
				totalItems,
				limit,
				results: results[0].data,
			};
		} catch (err) {
			console.log("Error --> MasterClassDao -> getAll()", err);
			throw err;
		}
	}

	async update(id, updates, session = null) {
		try {
			const result = await MasterClass.findOneAndUpdate(
				{
					_id: id,
					isDeleted: false,
				},
				{
					$set: {
						standard: updates.standard,
						subjects: updates.subjects,
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> MasterClassDao -> update", err);
			throw err;
		}
	}
}

module.exports = MasterClassDao;

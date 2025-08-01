const Facility = require("../models/facility.model");
const BaseDao = require("./base.dao");

class FacilityDao extends BaseDao {
	constructor() {
		super(Facility);
	}

	async getById(id) {
		try {
			let result = await this.Model.findOne({ _id: id, isDeleted: false });
			return result;
		} catch (err) {
			console.log("Error --> FacilityDao -> getById()", err);
			throw err;
		}
	}

	async update(data, session = null) {
		try {
			const result = await Facility.findOneAndUpdate(
				{
					_id: data?._id,
					isDeleted: false,
				},
				{
					$set: data,
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> FacilityDao -> update", err);
			throw err;
		}
	}
}

module.exports = FacilityDao;

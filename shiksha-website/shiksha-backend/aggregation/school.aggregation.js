const School = require("../models/school.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

class SchoolAggregation {
	async getSchoolById(id) {
		try {
			let pipeline = [
				{
					$match: {
						_id: new ObjectId(id),
					},
				},
				{
					$project: {
						"holidayList._id": 0,
						createdAt: 0,
						updatedAt: 0,
						__v: 0,
					},
				},
			];

			let school = await School.aggregate(pipeline);
			if (school) return school;

			return [];
		} catch (err) {
			console.log("Error --> SchoolAggregation --> getSchoolById");
			throw err;
		}
	}
}

const schoolAggregation = new SchoolAggregation();

module.exports = schoolAggregation;

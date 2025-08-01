const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const regenerateLogAggregation = require("../aggregation/regenerate.log.aggregation");
const RegeneratedLessonResource = require("../models/regenerate.lesson.resource.model");
const BaseDao = require("./base.dao.js");

class RegeneratedLessonResourceDao extends BaseDao {
	constructor() {
		super(RegeneratedLessonResource);
	}

	async getOne(filter) {
		try {
			let result = await RegeneratedLessonResource.findOne(filter).sort({ _version: -1 });
			return result;
		} catch (err) {
			console.log("Error --> BaseDao -> getOne()", err);
			throw err;
		}
	}

	async update(filter, updateData) {
		try {
			const result = await RegeneratedLessonResource.findOneAndUpdate(
				filter,
				{ $set: updateData },
				{ new: true }
			);
			return result;
		} catch (err) {
			console.log("Error --> RegeneratedLessonResourceDao -> update()", err);
			throw err;
		}
	}

	async getContentActivity(page = 1, limit = 10, filters = {}, sort = {}) {
		try {
			const processedFilters = {};

			for (const key in filters) {
				switch (key) {
					case "class":
						processedFilters[`content.class`] = Number(filters[key]);
						break;
					case "state":
					case "district":
					case "block":
					case "zone":
						processedFilters[`user.school.${key}`] = filters[key];
						break;
					case "subject":
						processedFilters[`content.${key}`] = filters[key];
						break;
					case "schoolId":
						processedFilters[`user.school._id`] = new ObjectId(filters[key]);
						break;

					default:
						processedFilters[key] = filters[key];
				}
			}

			const results = await regenerateLogAggregation.getContentActivity(
				page,
				limit,
				processedFilters,
				sort
			);

			const totalItems =
				results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

			return {
				page,
				totalItems,
				limit,
				results: results[0].data,
			};
		} catch (err) {
			console.log(
				"Error -> RegeneratedLessonResourceDao -> getContentActivity",
				err
			);
			throw err;
		}
	}

	async getAllContentActivity(filters = {}) {
		try {
			const processedFilters = {};

			for (const key in filters) {
				switch (key) {
					case "class":
						processedFilters[`content.class`] = Number(filters[key]);
						break;
					case "state":
					case "district":
					case "block":
					case "zone":
						processedFilters[`user.school.${key}`] = filters[key];
						break;
					case "subject":
						processedFilters[`content.${key}`] = filters[key];
						break;
					case "_id":
						processedFilters[`user.school._id`] = new ObjectId(filters[key]);
						break;

					default:
						processedFilters[key] = filters[key];
				}
			}

			const results = await regenerateLogAggregation.getAllContentActivity(
				processedFilters
			);

			const totalItems =
				results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

			return {
				totalItems,
				results: results[0].data,
			};
		} catch (err) {
			console.log(
				"Error -> RegeneratedLessonResourceDao -> getAllContentActivity",
				err
			);
			throw err;
		}
	}
}

module.exports = RegeneratedLessonResourceDao;

const masterResourceAggregation = require("../aggregation/master.resource.aggregation.js");
const MasterResource = require("../models/master.resource.model.js");
const BaseDao = require("./base.dao.js");

class MasterResourceDao extends BaseDao {
	constructor() {
		super(MasterResource);
	}

	async getAll(page = 1, limit = 10, filters = {}, sort = {}) {
		try {
			const processedFilters = {};

			for (const key in filters) {
				if (key === "class") {
					processedFilters[key] = Number(filters[key]);
				} else if (
					key === "topics" ||
					key === "subTopics" ||
					key === "board" ||
					key === "medium"
				) {
					processedFilters[`chapter.${key}`] = filters[key];
				} else {
					processedFilters[key] = filters[key];
				}
			}

			const results = await masterResourceAggregation.getMasterResourcesFilter(
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
			console.log("Error --> MasterResourceDao -> getAll()", err);
			throw err;
		}
	}

	async update(id, updates, session = null) {
		try {
			const result = await MasterResource.findOneAndUpdate(
				{
					_id: id,
				},
				{
					$set: {
						methodOfTeaching: updates.methodOfTeaching,
						content: updates.content,
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> MasterResourceDao -> update", err);
			throw err;
		}
	}

	async updateByFilter(filter, updateData) {
		try {
			const result = await MasterResource.findOneAndUpdate(
				filter,
				{ $set: updateData },
				{ new: true }
			);
			return result;
		} catch (err) {
			console.log("Error --> MasterResourceDao -> updateByFilter()", err);
			throw err;
		}
	}

	async getSubtopicResourceList(chapterId) {
		try {
			const results =
				await masterResourceAggregation.getSubtopicResourceListByChapterId(
					chapterId
				);
			return results;
		} catch (err) {
			console.log(
				"Error --> MasterResourceDao -> getSubtopicResourceList()",
				err
			);
			throw err;
		}
	}

	async generateResourcePlan(resourceId, filters = {}) {
		try {
			let processedFilters = {};

			for (const key in filters) {
				if (key === "includeVideos" && filters[key] === "true") {
					processedFilters["videos"] = {
						$exists: true,
						$not: {
							$size: 0,
						},
					};
				}
				if (key === "levels") {
					processedFilters[key] = JSON.parse(filters[key]);
				}
			}

			const result = await masterResourceAggregation.generateResourcePlan(
				resourceId,
				processedFilters
			);

			if (result.success) {
				return result.data;
			}

			return false;
		} catch (err) {
			console.log("Error --> MasterResourceDao -> generateResourcePlan", err);
			throw err;
		}
	}
}

module.exports = MasterResourceDao;

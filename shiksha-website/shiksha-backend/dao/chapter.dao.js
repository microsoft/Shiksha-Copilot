const chapterAggregation = require("../aggregation/chapter.aggregation");
const Chapter = require("../models/chapter.model");
const BaseDao = require("./base.dao");

class ChapterDao extends BaseDao {
	constructor() {
		super(Chapter);
	}

	async getAll(page = 1, limit = 10, filters = {}, sort = {}) {
		try {
			let processedFilters = {};

			// for kannada medium english subject negating medium filter to refect english lp from english medium 
			if (filters?.medium === "kannada" && filters?.subject?.startsWith("english")) {
				delete filters.medium;
			}

			for (const key in filters) {
				if (key === "standard") {
					processedFilters[key] = Number(filters[key]);
				} else if (key == "subject") {
					processedFilters["subject.subjectName"] = filters[key];
				} else {
					processedFilters[key] = filters[key];
				}
			}

			const results = await chapterAggregation.getChapterFilter(
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
			console.log("Error --> ChapterDao -> getAll()", err);
			throw err;
		}
	}

	async getChapterBySemester(filters = {}) {
		try {
			let processedFilters = {};

			for (const key in filters) {
				if (key === "standard") {
					processedFilters[key] = Number(filters[key]);
				} else if (key == "subject") {
					let subjectarr = JSON.parse(filters[key]);
					processedFilters["subject.subjectName"] = {$in:subjectarr};
				} else {
					processedFilters[key] = filters[key];
				}
			}

			const results = await chapterAggregation.getChapterBySemester(
				processedFilters
			);

			return results;
		} catch (err) {
			console.log("Error --> ChapterDao -> getAll()", err);
			throw err;
		}
	}
}

module.exports = ChapterDao;

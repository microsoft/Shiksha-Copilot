const Chapter = require("../models/chapter.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class ChapterAggregation {
	async getChapterFilter(page, limit, filter, sort) {
		try {
			let pipeline = [
				{
					$lookup: {
						from: "mastersubjects",
						localField: "subjectId",
						foreignField: "_id",
						as: "subject",
					},
				},
				{ $match: {...filter, isDeleted:false} },
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

			let chapters = await Chapter.aggregate(pipeline);

			if (chapters) return chapters;

			return [];
		} catch (err) {
			console.log("Error --> ChapterAggregation --> getChapterFilter");
			throw err;
		}
	}

	async getChapterBySemester(filter) {
		try {
			let pipeline = [
				{
					$lookup: {
						from: "mastersubjects",
						localField: "subjectId",
						foreignField: "_id",
						as: "subject",
					},
				},
				{ $match: filter }
			];

			let chapters = await Chapter.aggregate(pipeline);

			if (chapters) return chapters;

			return [];
		} catch (err) {
			console.log("Error --> ChapterAggregation --> getChapterBySemester");
			throw err;
		}
	}

	async getChapterByIdAndSubtopicFilter(chapterId,subTopics){
		try{
			const pipeline = [
				{
				  $match: {
					_id: new ObjectId(chapterId)
				  }
				},
				{
				  $project: {
					title:"$topics",
      				index_path:"$indexPath",
      				learning_outcomes:"$learningOutcomes",
      				_id:0,
      				subtopics: {
					  $map: {
						input: {
						  $filter: {
							input: "$topicsLearningOutcomes",
							as: "item",
							cond: { $in: ["$$item.title", subTopics] }
						  }
						},
						as: "filteredItem",
						in: {
						  "title": "$$filteredItem.title",
						  "learning_outcomes": "$$filteredItem.learningOutcomes"
						}
					  }
					}
				  }
				}
			  ]
			  let chapterData = await Chapter.aggregate(pipeline);

			  if (chapterData) return chapterData;
  
			  return [];
		  } catch (err) {
			  console.log("Error --> ChapterAggregation --> getChapterByIdAndSubtopicFilter");
			  throw err;
		  }
	}

	async getChapterByIdsAndFilterObject(chapterIds){
		try{
			const chapterIdsArr = chapterIds.map(id => new ObjectId(id));
			const pipeline = [
				{
				  $match:
					{
					  _id: {
						$in: chapterIdsArr
					  }
					}
				},
				{
				  $project:
					{
					  _id: 0,
					  title: "$topics",
					  index_path: "$indexPath",
					  learning_outcomes: "$learningOutcomes"
					}
				}
			  ]

		 let chapterData = await Chapter.aggregate(pipeline);

			  if (chapterData) return chapterData;
  
			  return [];
		  } catch (err) {
			  console.log("Error --> ChapterAggregation --> getChapterByIdsAndFilterObject");
			  throw err;
		  }
	}
}

const chapterAggregation = new ChapterAggregation();

module.exports = chapterAggregation;

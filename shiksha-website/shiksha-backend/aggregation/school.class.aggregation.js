const ClassModel = require("../models/school.class.model");
const School = require("../models/school.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

class ClassAggregation {
	async getClassesBySchoolId(schoolId) {
		try {
			const pipeline = [
				{
				  $match: {
					schoolId: new mongoose.Types.ObjectId(schoolId),
				  },
				},
				{
				  $unwind: "$classDetails",
				},
				{
				  $sort: {
					"classDetails.standard": 1, 
				  },
				},
				{
				  $group: {
					_id: "$_id",
					board: { $first: "$board" },
					medium: { $first: "$medium" },
					start: { $first: "$start" },
					end: { $first: "$end" },
					schoolId: { $first: "$schoolId" },
					isDeleted: { $first: "$isDeleted" },
					classDetails: { $push: "$classDetails" },
				  },
				},
				{
				  $project: {
					createdAt: 0,
					updatedAt: 0,
					__v: 0,
					"classDetails.createdAt": 0,
					"classDetails.updatedAt": 0,
					"classDetails.__v": 0,
				  },
				},
			  ];
			  
			let classes = await ClassModel.aggregate(pipeline);
			if (classes) return classes;

			return [];
		} catch (err) {
			console.log("Error --> ClassAggregation --> getClassesBySchoolId");
			throw err;
		}
	}

	async getGroupClassesByBoard(schoolId) {
		try {

			let pipeline = [
				{
					$match: {
						schoolId: new ObjectId(schoolId),
					},
				},
				{
					$unwind: "$classDetails"
				},
				{
					$sort: {
						"classDetails.standard": 1
					}
				},
				{
					$group: {
						_id: "$_id",
						board: { $first: "$board" },
						medium: { $first: "$medium" },
						start: { $first: "$start" },
						end: { $first: "$end" },
						classDetails: { $push: "$classDetails" },
						schoolId: { $first: "$schoolId" },
						isDeleted: { $first: "$isDeleted" }
					}
				},
				{
					$group: {
						_id: "$board",
						medium: {
							$push: "$$ROOT",
						},
					},
				},
				{
					$lookup: {
						from: "mastersubjects",
						let: { boardId: "$_id" },
						pipeline: [
							{
								$match: {
									$expr: { $in: ["$$boardId", "$boards"] },
								},
							},
							{ 
								$group: {
								  _id:"$name",
									 subjects: { 
									$push: {
									  subjectName: "$subjectName",
									  boards: "$boards",
									  isDeleted: "$isDeleted",
									  createdAt: "$createdAt",
									  updatedAt: "$updatedAt",
									  sem: "$sem",
									  _id: "$_id"
									}
								  }
							   
								}
							  }
						],
						as: "subjects",
					},
				},
				{
					$unset: "medium.board",
				}
			];
			

			let classes = await ClassModel.aggregate(pipeline);

			if (classes)
			{
				return  classes 
			}

			return [];
		} catch (err) {
			console.log("Error --> ClassAggregation --> getGroupClassesByBoard");

			throw err;
		}
	}
}

const classAggregation = new ClassAggregation();

module.exports = classAggregation;

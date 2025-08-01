const User = require("../models/user.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class UserAggregation {
  async getUserList(page, limit, processedFilters, sort) {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "schools",
            localField: "school",
            foreignField: "_id",
            as: "school",
          },
        },
        { $unwind: { path: "$school", preserveNullAndEmptyArrays: true } },
        { $match: processedFilters },
        {
          $project: {
            otp: 0,
          },
        },
        {
          $facet: {
            data: [
              { $sort: sort },
              ...(limit > 0
                ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
                : []),
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ];

      let users = await User.aggregate(pipeline);

      return users;
    } catch (err) {
      console.log("Error --> UserAggregation, getUserList", err);
      throw err;
    }
  }

  async getClasswithGroupedSubjects(id) {
    try {
      let pipeline = [
        {
          $match: {
            _id: new ObjectId(id),
          },
        },
        {
          $unwind: {
            path: "$classes"
          },
        },
        {
          $group: {
            _id: {
              name: "$classes.name",
              board: "$classes.board",
              class: "$classes.class",
              medium: "$classes.medium",
            },
            subjects: {
              $push: {
                subjectName: "$classes.subject",
                sem: "$classes.sem",
              },
            },
          },
        },
        {
          $project: {
            name: "$_id.name",
            board: "$_id.board",
            class: "$_id.class",
            medium: "$_id.medium",
            subjects: 1,
            _id: 0,
          },
        },
      ];
      let groupedClasseswithSubjects = await User.aggregate(pipeline);
      return groupedClasseswithSubjects;
    } catch (err) {
      console.log("Error --> UserAggregation, getGroupedSubjects", err);
      throw err;
    }
  }
}

const userAggregation = new UserAggregation();

module.exports = userAggregation;

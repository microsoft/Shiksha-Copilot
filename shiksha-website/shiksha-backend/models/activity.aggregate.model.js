// activityRatingAggregate.model.js
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;


const ActivityRatingAggregateSchema = new mongoose.Schema({
  activityId: { type: String, required: true }, // Unique ID for the activity
  masterResourceId: { type: ObjectId,
			ref: "MasterResource", },

  totalReviews: { type: Number, default: 0 },       // How many teachers rated this activity
  averageStars: { type: Number, default: 0 },       // Average star rating

  engagementCounts: {
    distracted: { type: Number, default: 0 },
    motivated: { type: Number, default: 0 },
    interactive: { type: Number, default: 0 },
  },

  alignmentCounts: {
    notAligned: { type: Number, default: 0 },
    partial: { type: Number, default: 0 },
    strong: { type: Number, default: 0 },
  },

  applicationCounts: {
    notRelevant: { type: Number, default: 0 },
    notApplicable: { type: Number, default: 0 },
    relevant: { type: Number, default: 0 },
  },

  notPerformedCounts: {
    notSuitable: { type: Number, default: 0 },
    timeConstraints: { type: Number, default: 0 },
    resourcesUnavailable: { type: Number, default: 0 },
  },
}, { timestamps: true }); // optional: keep createdAt and updatedAt


const ActivityRatingAggregate = mongoose.model("ActivityRatingAggregate", ActivityRatingAggregateSchema);

module.exports = ActivityRatingAggregate;
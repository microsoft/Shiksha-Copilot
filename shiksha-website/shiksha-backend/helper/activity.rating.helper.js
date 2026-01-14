const mongoose = require("mongoose");
const ActivityRatingAggregate = require("../models/activity.aggregate.model");
const ObjectId = mongoose.Types.ObjectId;

/**
 * Recursively collect all activities from resources
 */
function collectActivities(resources, activityMap = {}) {
  if (!resources || !Array.isArray(resources)) return activityMap;

  resources.forEach(resource => {
    if (resource.content && Array.isArray(resource.content)) {
      resource.content.forEach(item => {
        if (item.id) {
          activityMap[item.id] = item;
        }
        // Recurse if deeper content exists
        if (item.content && Array.isArray(item.content)) {
          collectActivities([item], activityMap);
        }
      });
    }

    // Recurse for resources within a resource (nested)
    if (resource.resources && Array.isArray(resource.resources)) {
      collectActivities(resource.resources, activityMap);
    }
  });

  return activityMap;
}

/**
 * Attach aggregate ratings to activities in a resource or array of resources
 * @param {Array|Object} lessonResources - Array of lesson objects or a single lesson object
 * @param {String|ObjectId} masterResourceId - master resource ID for fetching aggregates
 */
async function attachAggregateRatings(lessonResources, masterResourceId) {
  if (!lessonResources) return lessonResources;

  // Convert to ObjectId if it's a string
  let masterResourceObjectId;
  try {
    masterResourceObjectId = new ObjectId(masterResourceId);
  } catch (err) {
    throw new Error("Invalid masterResourceId provided");
  }

  // Normalize input to array
  const lessons = Array.isArray(lessonResources) ? lessonResources : [lessonResources];

  for (const lesson of lessons) {
    const activityMap = collectActivities(lesson.resources);

    const activityIds = Object.keys(activityMap);
    if (!activityIds.length) continue;

    const activityAggregates = await ActivityRatingAggregate.find({
      activityId: { $in: activityIds },
      masterResourceId: masterResourceObjectId
    });

    const aggregateMap = {};
    activityAggregates.forEach(agg => {
      aggregateMap[agg.activityId] = agg;
    });

    // Attach aggregates
    activityIds.forEach(id => {
      const activity = activityMap[id];
      const agg = aggregateMap[id];
      if (agg) {
        activity.aggregateRating = {
          averageStars: agg.averageStars,
          totalReviews: agg.totalReviews,
          engagementCounts: agg.engagementCounts,
          alignmentCounts: agg.alignmentCounts,
          applicationCounts: agg.applicationCounts,
          notPerformedCounts: agg.notPerformedCounts
        };
      } else {
        activity.aggregateRating = null;
      }
    });
  }

  return lessonResources;
}

module.exports = { attachAggregateRatings };

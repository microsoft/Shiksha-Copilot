const BaseManager = require("./base.manager");
const formatApiReponse = require("../helper/response");
const TeacherLessonPlanModel = require("../models/teacher.lesson.plan.model");
const TeacherLessonPlanDao = require("../dao/teacher.lesson.plan.dao");
const teacherLessonPlanAggregation = require("../aggregation/teacher.lesson.plan.aggregation");
const { postToCopilotBot } = require("../services/copilot.bot.service.js");
const ChapterDao = require("../dao/chapter.dao");
const MasterSubjectDao = require("../dao/master.subject.dao");
const MasterLessonDao = require("../dao/master.lesson.dao");
const logger = require("../config/loggers"); 
const RegeneratedLessonResourceDao = require("../dao/regenerate.log.dao");
const LessonFeedbackDao = require("../dao/feedback.lesson.dao");
const {
	formatTemplate,
	formatSections
} = require("../helper/formatter");
const { REGENERATION_LIMIT } = require("../config/constants.js");
const LessonPlanTemplateDao = require("../dao/lesson.plan.template.dao.js");
const LessonPlanTemplate = require("../models/lesson.plan.template.model.js");
const TeacherLessonPlan = require("../models/teacher.lesson.plan.model");
const mongoose = require("mongoose");
const ActivityRatingAggregate = require("../models/activity.aggregate.model.js");
const { attachAggregateRatings } = require("../helper/activity.rating.helper.js");

class TeacherLessonPlanManager extends BaseManager {
	constructor() {
		super(new TeacherLessonPlanDao());
		this.teacherLessonPlanDao = new TeacherLessonPlanDao();
		this.chapterDao = new ChapterDao();
		this.masterLessonDao = new MasterLessonDao();
		this.lessonPlanTemplateDao = new LessonPlanTemplateDao();
		this.subjectDao = new MasterSubjectDao();
		this.regeneratedLessonResource = new RegeneratedLessonResourceDao();
		this.lessonFeedbackDao = new LessonFeedbackDao();
	}

	async getByTeacherAndPagination(
		teacherId,
		page = 1,
		limit = 999,
		filters = {},
		sort = {}
	) {
		try {
			if (filters.type != "all") {
				let lessons = await this.teacherLessonPlanDao.getByTeacherAndPagination(
					teacherId,
					filters.type,
					page,
					limit,
					filters,
					sort
				);

				return formatApiReponse(
					true,
					"",
					lessons.results.sort((a, b) => b.updatedAt - a.updatedAt)
				);
			} else {
				let lessons = await this.teacherLessonPlanDao.getByTeacherAndPagination(
					teacherId,
					"lesson",
					page,
					limit,
					filters,
					sort
				);

				let resources =
					await this.teacherLessonPlanDao.getByTeacherAndPagination(
						teacherId,
						"resource",
						page,
						limit,
						filters,
						sort
					);

				return formatApiReponse(
					true,
					"",
					[...lessons.results, ...resources.results].sort(
						(a, b) => b.updatedAt - a.updatedAt
					)
				);
			}
		} catch (err) {
			return formatApiReponse(false, err.message, err);
		}
	}

	async getMonthlyCount(teacherId, filter) {
		try {
			const monthlyCounts = await teacherLessonPlanAggregation.getMonthlyCount(
				teacherId,
				filter
			);
			return formatApiReponse(true, "", monthlyCounts);
		} catch (error) {
			console.error("Error fetching monthly counts:", error);
			return formatApiReponse(false, "Internal server error", error);
		}
	}

	async getRegenerationLimit(teacherId){
		try {
			const regenerationCounts = await this.regeneratedCount(teacherId);

			return formatApiReponse(true, "", {regenerationLimitReached:regenerationCounts >= REGENERATION_LIMIT });
		} catch (error) {
			console.error("Error fetching regeneration limit:", error);
			return formatApiReponse(false, "Internal server error", error);
		}
	}

	async checkIfLessonPlanExists(teacherId, lessonPlanId) {
		try {
			const lessonPlan = await TeacherLessonPlanModel.findOne({
				teacherId,
				lessonId: lessonPlanId,
			});
			return !!lessonPlan;
		} catch (error) {
			console.error("Error checking if lesson plan exists:", error);
			throw new Error("Internal server error");
		}
	}

	async getLessonPlanById(teacherId, lessonPlanId) {
		try {
			const lessonPlan = await this.teacherLessonPlanDao.getLessonPlanById(
				teacherId,
				lessonPlanId
			);
			if (lessonPlan) {
				return formatApiReponse(true, "", lessonPlan);
			} else {
				return formatApiReponse(false, "Lesson plan not found", null);
			}
		} catch (error) {
			console.error("Error getting lesson plan by ID:", error);
			return formatApiReponse(false, "Internal server error", error);
		}
	}

	async generateContent(teacherId, payload) {
		try {
			const regenerationCount = await this.regeneratedCount(teacherId);
			if(regenerationCount >= REGENERATION_LIMIT){
				return formatApiReponse(false, `Daily regeneration limit of ${REGENERATION_LIMIT} has been reached.`, null);
			}
			const masterLesson = await this.masterLessonDao.getById(payload.lessonId);
			if (!masterLesson) {
				throw new Error(`Master lesson with ID ${payload.lessonId} not found`);
			  }
			
			const template = await this.lessonPlanTemplateDao.getById(masterLesson?.templateId) 
			  
			const chapter = await this.chapterDao.getById(masterLesson.chapterId);
			if (!chapter) {
				throw new Error(`Chapter with ID ${masterLesson.chapterId} not found`);
			  }
			const subject = await this.subjectDao.getById(chapter.subjectId);
			if (!subject) {
				throw new Error(`Subject with ID ${chapter.subjectId} not found`);
			  }
			const highestVersionEntry = await this.regeneratedLessonResource.getOne({
				isLoGeneratedContent: true,
				isMasterContent: true,
				contentId: masterLesson._id,
			});
			const version = highestVersionEntry
				? highestVersionEntry._version + 1
				: 1;
			const requestData = this._createBotPayload(chapter, subject, payload, template);
			const result = await postToCopilotBot(requestData);

			if (result.status !== 202) {
				logger.error(`Unexpected status code from Copilot bot: ${result.status}`);
				throw new Error(`Unexpected status code from Copilot bot: ${result.status}`);
			  }

			  logger.info(`Successfully received expected response from Copilot bot ${result.data.instance_id}`);
			const lesson = await this.masterLessonDao.create({
				name: `Version-${version} ${masterLesson.name}`,
				isAll: masterLesson.isAll,
				class: chapter.standard,
				chapterId: chapter._id,
				board: chapter.board,
				subTopics: masterLesson.subTopics,
				medium: chapter.medium,
				subject: subject.subjectName,
				learningOutcomes: payload.learningOutcomes,
				isRegenerated: true,
				templateId:masterLesson?.templateId
			});
			if (!lesson) {
				throw new Error("Failed to create new teacher master lesson");
			  }

			const teacherLessonPlanData = {
				teacherId: teacherId,
				lessonId: lesson._id,
				status: "running",
				learningOutcomes: payload.learningOutcomes,
				isGenerated: true,
				instanceId: result.data.instance_id,
			};

			let newTeacherLessonPlan = await this.teacherLessonPlanDao.create(
				teacherLessonPlanData
			);

			if (!newTeacherLessonPlan) {
				throw new Error("Failed to create teacher lesson plan");
			  }

			await this.regeneratedLessonResource.create({
				isLesson: true,
				isMasterContent: !masterLesson.isRegenerated,
				isLoGeneratedContent: true,
				recordId: newTeacherLessonPlan._id,
				contentId: masterLesson._id,
				status:"running",
				genContentId: newTeacherLessonPlan.lessonId,
				generatedBy: newTeacherLessonPlan.teacherId,
				_version: version,
			});

			return formatApiReponse(true, "Generation is in progress!",{data: result.data,requestData});
		} catch (error) {
			logger.error('Error handling request', { message: error.message, stack: error.stack });
			return formatApiReponse(false, "Failed to generate the content", error);
		}
	}

	async getResourcePlanById(teacherId, resourcePlanId) {
		try {
			const resourcePlan = await this.teacherLessonPlanDao.getResourcePlanById(
				teacherId,
				resourcePlanId
			);
			if (resourcePlan) {
				const rattingAttachedResourcePlan = await attachAggregateRatings(resourcePlan,resourcePlanId)
				return formatApiReponse(true, "", rattingAttachedResourcePlan);

			} else {
				return formatApiReponse(false, " Resource plan not found", null);
			}
		} catch (error) {
			console.error("Error getting resource plan by ID:", error);
			return formatApiReponse(false, "Internal server error", error);
		}
	}

	async _createRegeneratedLessonResource(teacherLessonPlan, masterLesson) {
		await this.regeneratedLessonResource.create({
			isLesson: true,
			isMasterContent: !masterLesson.isRegenerated,
			recordId: teacherLessonPlan._id,
			contentId: masterLesson._id,
			status:"running",
			genContentId: teacherLessonPlan.lessonId,
			generatedBy: teacherLessonPlan.teacherId,
		});
	}
	
	async regenerateContent(teacherId, payload) {
		try {
			const regenerationCount = await this.regeneratedCount(teacherId);
			if(regenerationCount >= REGENERATION_LIMIT){
				return formatApiReponse(false, `Daily regeneration limit of ${REGENERATION_LIMIT} has been reached.`, null);
			}
			const masterLesson = await this.masterLessonDao.getById(payload.lessonId);
			if (!masterLesson) {
				throw new Error(`Master lesson with ID ${payload.lessonId} not found`);
			  }
			const template = await this.lessonPlanTemplateDao.getById(masterLesson?.templateId) 

			const chapter = await this.chapterDao.getById(masterLesson.chapterId);
			if (!chapter) {
				throw new Error(`Chapter with ID ${masterLesson.chapterId} not found`);
			  }
			const subject = await this.subjectDao.getById(chapter.subjectId);
			if (!subject) {
				throw new Error(`Subject with ID ${chapter.subjectId} not found`);
			  }
			payload.lessonPlan = this._createLessonPlanPayload(
				masterLesson.sections,
				payload.regenFeedback
			);
			payload.learningOutcomes = masterLesson.learningOutcomes;
			let requestData = this._createBotPayload(chapter, subject, payload,template);
			const result = await postToCopilotBot(requestData);

			  if (result.status !== 202) {
				logger.error(`Unexpected status code from Copilot bot: ${result.status}`);
				throw new Error(`Unexpected status code from Copilot bot: ${result.status}`);
			  }
			  logger.info(`Successfully received expected response from Copilot bot ${result.data.instance_id}`);

			const lesson = await this.masterLessonDao.create({
				name: masterLesson.name,
				isAll:masterLesson.isAll,
				class: chapter.standard,
				chapterId: chapter._id,
				board: chapter.board,
				subTopics: masterLesson.subTopics,
				medium: chapter.medium,
				subject: subject.subjectName,
				learningOutcomes: masterLesson.learningOutcomes,
				isRegenerated: true,
				templateId:masterLesson.templateId
			});

			const feedbackPayload = {
				feedbackPerSets: payload.feedbackPerSets,
				feedback: payload.feedback,
				overallFeedbackReason: payload.overallFeedbackReason,
				isCompleted: false,
				regenFeedback:payload.regenFeedback
			};

			const existingLessonPlan = await this.teacherLessonPlanDao.getOne({
				teacherId: teacherId,
				lessonId: payload.lessonId,
			});

			if (!existingLessonPlan) {
				const newTeacherLessonPlanData = {
					teacherId: teacherId,
					lessonId: lesson._id,
					baseLessonId: masterLesson._id,
					status: "running",
					isGenerated: true,
					learningOutcomes: masterLesson.learningOutcomes,
					sections: masterLesson.sections,
					instanceId: result.data.instance_id,
				};

				const newTeacherLessonPlan = await this.teacherLessonPlanDao.create(
					newTeacherLessonPlanData
				);
				await this.lessonFeedbackDao.create({
					...feedbackPayload,
					teacherId: teacherId,
					lessonId: masterLesson._id,
				});
			} else {
				const existingLessonPlan =
					await this.teacherLessonPlanDao.updateForRegenerate(
						teacherId,
						payload.lessonId,
						lesson._id,
						result.data.instance_id
					);

				const existingFeedback = await this.lessonFeedbackDao.getOne({
					teacherId: teacherId,
					lessonId: payload.lessonId,
				});
				if (!existingFeedback) {
					await this.lessonFeedbackDao.create({
						...feedbackPayload,
						teacherId: teacherId,
						lessonId: payload.lessonId,
					});
				} else {
					await this.lessonFeedbackDao.update(
						existingFeedback._id,
						feedbackPayload
					);
				}
			}

			return formatApiReponse(
				true,
				"Regeneration is in progress!",
				result.data
			);
		} catch (error) {
			console.error(
				"Error -> TeacherLessonPlanManager -> regenerateContent",
				error
			);
			return formatApiReponse(false, "Failed to generate the content!", null);
		}
	}

	async regeneratedCount(teacherId){
		try{
			const todayStart = new Date();
			todayStart.setUTCHours(0, 0, 0, 0);
	
			const todayEnd = new Date();
			todayEnd.setUTCHours(23, 59, 59, 999);
    
            const regenerationCount = await this.teacherLessonPlanDao.getRegeneratedLessonPlansCount(teacherId, todayStart, todayEnd);
			return regenerationCount
		}catch(error){
			console.error("Error -> TeacherLessonPlanController -> regeneratedCount", error);
            return res.status(500).json({ error: "Internal server error" });
		}
	}

	async processWebhookData(webhookData) {
		
		try {
			const { instance_id , status, output } = webhookData;

			const existingLessonPlan = await this.teacherLessonPlanDao.getOne({
				instanceId: instance_id,
			});

			const regeneratedLog = await this.regeneratedLessonResource.getOne({
				genContentId: existingLessonPlan.lessonId,
				recordId: existingLessonPlan._id
			});

			if (!existingLessonPlan) {
				return formatApiReponse(false, "Lesson plan not found", null);
			}
			if (status.toLowerCase() === "completed") {
				const masterLessonPlan = await this.masterLessonDao.getById(
					existingLessonPlan.lessonId
				);

				const lessonPlanTemplate = await LessonPlanTemplate.findById(masterLessonPlan?.templateId)

				const sections = formatSections(output.sections,lessonPlanTemplate.sections);

				const masterLessonUpdate = {
					id: masterLessonPlan._id,
					sections
				};

				await this.masterLessonDao.update(masterLessonUpdate);
				const updateTeacherLessonPlanData = {
					status: status.toLowerCase(),
					sections
				};

				await this.teacherLessonPlanDao.updatePlan(
					existingLessonPlan._id,
					updateTeacherLessonPlanData
				);
				if (regeneratedLog) {
					await this.regeneratedLessonResource.update(
						regeneratedLog._id,
						{ status: status.toLowerCase() }
					);
				}
			} 
			else {
				const updateTeacherLessonPlanData = {
					status: status.toLowerCase(),
				};

				await this.teacherLessonPlanDao.updatePlan(
					existingLessonPlan._id,
					updateTeacherLessonPlanData
				);

				if (regeneratedLog) {
					await this.regeneratedLessonResource.update(
						regeneratedLog._id,
						{ status: status.toLowerCase() }
					);
				}
			}

			return formatApiReponse(
				true,
				"Webhook data processed successfully",
				existingLessonPlan
			);
		} catch (error) {
			console.error("Error processing webhook data:", error);
			return formatApiReponse(false, "Failed to process webhook data", error);
		}
	}

    async lessonUploadMedia(teacherId, lessonId, data) {
    try {
      const lessonPlan = await TeacherLessonPlan.findOne({
        teacherId,
        lessonId,
        isLesson: true,
      });

      if (!lessonPlan) {
        throw new Error("Lesson plan not found");
      }

      const section = lessonPlan.sections.find(
        (sec) => sec.id === data.sectionId
      );
      if (!section) {
        throw new Error("Section not found");
      }

      if (!section.media) section.media = [];

      if (section.media.length >= 3) {
        throw new Error("Maximum 3 uploads allowed per section");
      }

      const newMedia = {
        title: data?.title,
        type: data.type,
        link: data.link,
      };

      section.media.push(newMedia);

      await lessonPlan.save();

      return formatApiReponse(true, "Media uploaded successfully");
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error.message;
    }
  }

  async deleteLessonMedia(teacherId, lessonId, data) {
  try {
    const lessonPlan = await TeacherLessonPlan.findOne({
      teacherId,
      lessonId,
      isLesson: true,
    });

    if (!lessonPlan) throw new Error("Lesson plan not found");

    const section = lessonPlan.sections.find(
      sec => sec.id === data.sectionId
    );

    if (!section) throw new Error("Section not found");

    if (!section.media || section.media.length === 0) {
      throw new Error("No media to delete");
    }

    section.media = section.media.filter(
      m => m._id.toString() !== data.mediaId
    );

    lessonPlan.markModified("sections");
    await lessonPlan.save();

    return formatApiReponse(true, "Media deleted successfully");
  } catch (error) {
    console.error("Error deleting lesson media:", error);
    throw error.message;
  }
}

async deleteResourceMedia(teacherId, resourceId, data) {
  try {
    const resourcePlan = await TeacherLessonPlan.findOne({
      teacherId,
      resourceId,
      isLesson: false,
    });

    if (!resourcePlan) throw new Error("Resource plan not found");

    const resource = resourcePlan.resources.find(
      r => r.id === data.resourceId
    );

    if (!resource) throw new Error("Resource not found");

    const item = resource.content.find(
      c => c.id === data.itemId
    );

    if (!item || !item.media || item.media.length === 0) {
      throw new Error("No media to delete");
    }

    item.media = item.media.filter(
      m => m._id.toString() !== data.mediaId
    );

    resourcePlan.markModified("resources");
    await resourcePlan.save();

    return formatApiReponse(true, "Media deleted successfully");
  } catch (error) {
    console.error("Error deleting resource media:", error);
    throw error.message;
  }
}


  async resourceUploadMedia(teacherId, resourceId, data) {
    try {
      const resourcePlan = await TeacherLessonPlan.findOne({
        teacherId,
        resourceId,
        isLesson: false,
      });

      if (!resourcePlan) {
        throw new Error("Resource plan not found");
      }

      const resource = resourcePlan.resources.find(
        (r) => r.id === data.resourceId
      );

      if (!resource) {
        throw new Error("Resource not found");
      }

      const item = resource.content.find((c) => c.id === data.itemId);

      if (!item) {
        throw new Error("Resource item not found");
      }

      if (!item.media) item.media = [];

      if (item.media.length >= 3) {
        throw new Error("Only 3 uploads allowed");
      }

      const newMedia = {
        _id:new mongoose.Types.ObjectId(),
        type: data.type,
        link: data.link,
        uploadedAt:new Date()
      };

      item.media.push(newMedia);

      resourcePlan.markModified("resources");

      await resourcePlan.save();

      return formatApiReponse(true, "Media uploaded successfully");
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error.message;
    }
  }


async rateActivity(teacherId, resourceId, data) {
  try {
    const resourcePlan = await TeacherLessonPlan.findOne({
      teacherId,
      resourceId,
      isLesson: false,
    });

    if (!resourcePlan) throw new Error("Resource plan not found");

    const resource = resourcePlan.resources.find(r => r.id === data.resourceId);
    if (!resource) throw new Error("Resource not found");

    const activity = resource.content.find(c => c.id === data.activityId);
    if (!activity) throw new Error("Activity not found");

    // Keep previous rating if exists
    const prevRating = activity.rating || {};

    // Update teacher's rating
    activity.rating = {
      performed: data.performed,
      engagement: data.engagement || null,
      alignment: data.alignment || null,
      application: data.application || null,
      notPerformedReason: data.notPerformedReason || null,
      stars: data.stars != null ? data.stars : null,
      updatedAt: new Date(),
    };

    resourcePlan.markModified("resources");
    await resourcePlan.save();

    // Convert resourceId to ObjectId for masterResourceId
    const masterResourceObjectId = new mongoose.Types.ObjectId(resourceId);

    // Update aggregate
    const filter = { activityId: data.activityId, masterResourceId: masterResourceObjectId };
    let aggregate = await ActivityRatingAggregate.findOne(filter);

    if (!aggregate) {
      aggregate = new ActivityRatingAggregate({
        activityId: data.activityId,
        masterResourceId: masterResourceObjectId,
        totalReviews: 0,
        averageStars: 0,
        engagementCounts: { distracted: 0, motivated: 0, interactive: 0 },
        alignmentCounts: { notAligned: 0, partial: 0, strong: 0 },
        applicationCounts: { notRelevant: 0, notApplicable: 0, relevant: 0 },
        notPerformedCounts: { notSuitable: 0, timeConstraints: 0, resourcesUnavailable: 0 },
      });
    }

    // Helper to normalize keys to match aggregate keys
    const normalizeKey = (str) => {
      if (!str) return null;
      switch (str.trim()) {
        case "Motivated": return "motivated";
        case "Interactive": return "interactive";
        case "Distracted": return "distracted";
        case "Strong": return "strong";
        case "Partial": return "partial";
        case "Not Aligned": return "notAligned";
        case "Relevant": return "relevant";
        case "Not Relevant": return "notRelevant";
        case "Not Applicable": return "notApplicable";
        case "Not Suitable": return "notSuitable";
        case "Time Constraints": return "timeConstraints";
        case "Resources Unavailable": return "resourcesUnavailable";
        default: return str.toLowerCase().replace(/\s+/g, "");
      }
    };

    // Remove previous counts if updating
    if (prevRating.performed !== undefined) {
      if (prevRating.performed) {
        if (prevRating.engagement) {
          const key = normalizeKey(prevRating.engagement);
          aggregate.engagementCounts[key] = Math.max((aggregate.engagementCounts[key] || 1) - 1, 0);
        }
        if (prevRating.alignment) {
          const key = normalizeKey(prevRating.alignment);
          aggregate.alignmentCounts[key] = Math.max((aggregate.alignmentCounts[key] || 1) - 1, 0);
        }
        if (prevRating.application) {
          const key = normalizeKey(prevRating.application);
          aggregate.applicationCounts[key] = Math.max((aggregate.applicationCounts[key] || 1) - 1, 0);
        }
        if (prevRating.stars != null) {
          const prevTotalStars = aggregate.averageStars * aggregate.totalReviews;
          aggregate.averageStars = (prevTotalStars - prevRating.stars) / Math.max(aggregate.totalReviews - 1, 1);
        }
      } else if (prevRating.notPerformedReason) {
        const key = normalizeKey(prevRating.notPerformedReason);
        aggregate.notPerformedCounts[key] = Math.max((aggregate.notPerformedCounts[key] || 1) - 1, 0);
      }
      aggregate.totalReviews = Math.max((aggregate.totalReviews || 1) - 1, 0);
    }

    // Add new counts
    if (data.performed) {
      if (data.engagement) {
        const key = normalizeKey(data.engagement);
        aggregate.engagementCounts[key] = (aggregate.engagementCounts[key] || 0) + 1;
      }
      if (data.alignment) {
        const key = normalizeKey(data.alignment);
        aggregate.alignmentCounts[key] = (aggregate.alignmentCounts[key] || 0) + 1;
      }
      if (data.application) {
        const key = normalizeKey(data.application);
        aggregate.applicationCounts[key] = (aggregate.applicationCounts[key] || 0) + 1;
      }
      if (data.stars != null) {
        const prevTotalStars = aggregate.averageStars * aggregate.totalReviews;
        aggregate.totalReviews += 1;
        aggregate.averageStars = (prevTotalStars + data.stars) / aggregate.totalReviews;
      } else {
        aggregate.totalReviews += 1;
      }
    } else if (data.notPerformedReason) {
      const key = normalizeKey(data.notPerformedReason);
      aggregate.notPerformedCounts[key] = (aggregate.notPerformedCounts[key] || 0) + 1;
      aggregate.totalReviews += 1;
    }

    await aggregate.save();

    return { success: true, message: "Activity rated successfully", rating: activity.rating };
  } catch (error) {
    console.error("Error rating activity:", error);
    throw error.message;
  }
}




	async _checkStatusAndThrowError(regeneratedId, recordId) {
        try {
            const regeneratedLog = await this.regeneratedLessonResource.getById(regeneratedId);
            const teacherLessonPlan = await this.teacherLessonPlanDao.getById(recordId);

            if (!regeneratedLog || regeneratedLog.status.toLowerCase() !== "failed") {
                throw new Error("Regeneration log is either not found or not in a failed state.");
            }
            if (!teacherLessonPlan || teacherLessonPlan.status.toLowerCase() !== "failed") {
                throw new Error("Teacher lesson plan is either not found or not in a failed state.");
            }
            return true;
        } catch (error) {
            console.error("Error -> TeacherLessonPlanManager -> checkStatusAndThrowError", error);
            throw error.message; 
        }
    }


	async retryLessonPlan(regeneratedId, recordId) {
        try {
			await this._checkStatusAndThrowError(regeneratedId, recordId);

			const regeneratedLog = await this.regeneratedLessonResource.getById(regeneratedId);
			const teacherLessonPlan = await this.teacherLessonPlanDao.getById(recordId);

            const masterLesson = await this.masterLessonDao.getById(teacherLessonPlan.lessonId);
            if (!masterLesson) {
                throw new Error(`Master lesson with ID ${teacherLessonPlan.lessonId} not found`);
            }

            const chapter = await this.chapterDao.getById(masterLesson.chapterId);
            if (!chapter) {
                throw new Error(`Chapter with ID ${masterLesson.chapterId} not found`);
            }

            const subject = await this.subjectDao.getById(chapter.subjectId);
            if (!subject) {
                throw new Error(`Subject with ID ${chapter.subjectId} not found`);
            }

			let payload = {
				subTopics : masterLesson.subTopics,
				isAll: masterLesson.isAll,
				learningOutcomes : masterLesson.learningOutcomes,
			}
			if (!regeneratedLog.isLoGeneratedContent) {
				let feedback = await this.lessonFeedbackDao.getOne({
					teacherId: teacherLessonPlan.teacherId,
					lessonId:  teacherLessonPlan.baseLessonId,
				});
				payload.feedbackPerSets = feedback.feedbackPerSets;
				payload.lessonPlan = this._createLessonPlanPayload(
					masterLesson.instructionSet,
					payload.feedbackPerSets
				);
			}

			let requestData = this._createBotPayload(chapter, subject, payload);
			const result = await postToCopilotBot(requestData);

			if (result.status !== 202) {
				logger.error(`Unexpected status code from Copilot bot: ${result.status}`);
				throw new Error(`Unexpected status code from Copilot bot: ${result.status}`);
			  }
			    logger.info(`Successfully received expected response from Copilot bot ${result.data.instance_id}`);
			regeneratedLog.status="running";
			teacherLessonPlan.status ="running";
			teacherLessonPlan.instanceId = result.data.instance_id;

			regeneratedLog.save();
			teacherLessonPlan.save();
	
            return formatApiReponse(true, "Regeneration is in progress!", result.data);

        } catch (error) {
            return formatApiReponse(false, "Failed to retry the lesson plan", error);
        }
    }

_createLessonPlanPayload(sections, regenFeedback) {
const payloadSections =[]
		 sections.forEach((e)=>{
			const phaseFeedback = regenFeedback.find((ele)=> ele.type === e.title);
			let section = {
				section_id:e.id,
				section_title:e.title,
				content:e.content,
				regen_feedback:phaseFeedback?.feedback ? phaseFeedback.feedback : 'None'
			}
			payloadSections.push(section)

		 })

		 return {sections:payloadSections}
	}

	_createBotPayload(chapter, subject, payload, template) {
	const subjectString = subject.name.trim().toLowerCase();
    const pattern = /^english(?:\s+\d+(_\d+)?)?$/;
    const isEnglish = pattern.test(subjectString);
	let lp_type;

	if(isEnglish){
		const match = chapter.topics.match(/(POEM|PROSE)/);
		lp_type = match ? match[0] : null;
	}

		return {
			user_id: "ADMIN",
			workflow:formatTemplate(template),
			lp_id: payload.lessonId,
			lp_level: payload.isAll ? "CHAPTER" : "SUBTOPIC",
			learning_outcomes: payload.learningOutcomes,
			lp_type_english: isEnglish ? lp_type : 'NONE',
			chapter_info: {
				id: `Board=${chapter.board},Medium=${chapter.medium},Grade=${chapter.standard},Subject=${subject.subjectName},Number=${chapter.orderNumber},Title=${chapter.topics}`,
				index_path: chapter.indexPath ?? `shiksha/data_new_book/${chapter.board}/${chapter.medium}/${chapter.standard}/${subject.subjectName}/pdf/${chapter.orderNumber}/index/pdf_idx`,
				chapter_title:chapter.topics
			},
			subtopics: payload.isAll ? [] : payload?.subTopics,
			lesson_plan: payload?.lessonPlan || null,
		};
	}

}

module.exports = TeacherLessonPlanManager;

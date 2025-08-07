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
	restructureInstructionSet,
	restructureResources,
	restructureCheckList
} = require("../helper/formatter");
const { REGENERATION_LIMIT } = require("../config/constants.js");

class TeacherLessonPlanManager extends BaseManager {
	constructor() {
		super(new TeacherLessonPlanDao());
		this.teacherLessonPlanDao = new TeacherLessonPlanDao();
		this.chapterDao = new ChapterDao();
		this.masterLessonDao = new MasterLessonDao();
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
					lessons.results.sort((a, b) => b.createdAt - a.createdAt)
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
						(a, b) => b.createdAt - a.createdAt
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
			const requestData = this._createBotPayload(chapter, subject, payload);
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
				return formatApiReponse(true, "", resourcePlan);
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
			const chapter = await this.chapterDao.getById(masterLesson.chapterId);
			if (!chapter) {
				throw new Error(`Chapter with ID ${masterLesson.chapterId} not found`);
			  }
			const subject = await this.subjectDao.getById(chapter.subjectId);
			if (!subject) {
				throw new Error(`Subject with ID ${chapter.subjectId} not found`);
			  }
			payload.lessonPlan = this._createLessonPlanPayload(
				masterLesson.instructionSet,
				payload.regenFeedback
			);
			payload.learningOutcomes = masterLesson.learningOutcomes;
			let requestData = this._createBotPayload(chapter, subject, payload);
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
					instructionSet: masterLesson.instructionSet,
					instanceId: result.data.instance_id,
				};

				const newTeacherLessonPlan = await this.teacherLessonPlanDao.create(
					newTeacherLessonPlanData
				);
				await this._createRegeneratedLessonResource(
					newTeacherLessonPlan,
					masterLesson
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
				await this._createRegeneratedLessonResource(
					existingLessonPlan,
					masterLesson
				);
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
				const instructionSet = masterLessonPlan.isAll
					? restructureInstructionSet(output.instruction_set)
					: restructureInstructionSet(output.crisp_instruction_set);
				const extractedResources = restructureResources(
					output.extracted_resources
				);
				const checkList = restructureCheckList(output.checklist)
				const masterLessonUpdate = {
					id: masterLessonPlan._id,
					instructionSet,
					extractedResources,
					checkList
				};
				await this.masterLessonDao.update(masterLessonUpdate);
				const questionBank = extractedResources.find(
					(resource) => resource.section === "questionbank"
				);
				let evaluatedinstructionSet = instructionSet.map((is) => {
					if (is.type === "Evaluate") {
						is.info[0].content.main = questionBank.data;
					}
					return is;
				});
				const updateTeacherLessonPlanData = {
					status: status.toLowerCase(),
					instructionSet: evaluatedinstructionSet,
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
			} else {
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

	_createLessonPlanPayload(instructionSet, regenFeedback) {
		const lessonPlan = {};

		instructionSet.forEach((phase) => {
			const phaseType = phase.type.toLowerCase();
			const phaseFeedback = regenFeedback.find((ele)=> ele.type === phaseType);

			lessonPlan[phaseType] = {
				regen_feedback: phaseFeedback.feedback ? phaseFeedback.feedback : 'None',
				content: phase.info[0].content.main,
			};
		});

		return lessonPlan;
	}

	_createBotPayload(chapter, subject, payload) {
	const subjectString = subject.name.trim().toLowerCase();
    const pattern = /^english(?:\s+\d+(_\d+)?)?$/;
    const isEnglish = pattern.test(subjectString);
	let lp_type;

	if(isEnglish){
		const match = chapter.topics.match(/(POEM|PROSE)/);
		lp_type = match ? match[0] : null;
	}

		return {
			chapter_info: {
				id: `Board=${chapter.board},Medium=${chapter.medium},Grade=${chapter.standard},Subject=${subject.subjectName},Number=${chapter.orderNumber},Title=${chapter.topics}`,
				index_path: chapter.indexPath ?? `shiksha/data_new_book/${chapter.board}/${chapter.medium}/${chapter.standard}/${subject.subjectName}/pdf/${chapter.orderNumber}/index/pdf_idx`,
				location_based_generation: false,
				preferred_mot: "Observation model",
			},
			subtopics: payload.subTopics,
			learning_outcomes: payload.learningOutcomes,
			user_id: "ADMIN",
			lesson_plan: payload?.lessonPlan,
			lp_level: payload.isAll ? "CHAPTER" : "SUBTOPIC",
			teacher_location: "",
			lp_type_english: isEnglish ? lp_type : 'NONE'
		};
	}
}

module.exports = TeacherLessonPlanManager;

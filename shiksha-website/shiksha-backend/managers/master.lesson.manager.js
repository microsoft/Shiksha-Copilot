require("dotenv").config();

const BaseManager = require("./base.manager");
const MasterLessonDao = require("../dao/master.lesson.dao");
const formatApiReponse = require("../helper/response");
const TeacherLessonPlanDao = require("../dao/teacher.lesson.plan.dao");
const RegeneratedLessonResourceDao = require("../dao/regenerate.log.dao");
const regenerateLessonPlan = require("../services/copilot.bot.service");
const UserDao = require("../dao/user.dao");
const ChapterDao = require("../dao/chapter.dao");
const MasterSubjectDao = require("../dao/master.subject.dao");
const MasterResourceDao = require("../dao/master.resource.dao");
const Chapter = require("../models/chapter.model");
const { sortDataBySubTopics, restructureCheckListforLLM, getSemester, formatSubject } = require("../helper/formatter");
const logger = require("../config/loggers"); 
const { post5ETables } = require("../services/copilot.bot.service");
const {
	createData,
	subjectRegex,
	boardRegex,
	mediumRegex,
	orderNumberRegex,
	standardRegex,
	titleRegex,
} = require("../helper/data.helper");
const {
	restructureInstructionSet,
	restructureCheckList,
	restructureResources,
} = require("../helper/formatter");
const compareChapter = require("../helper/chapter.helper");


class MasterLessonManger extends BaseManager {
	constructor() {
		super(new MasterLessonDao());
		this.masterLessonDao = new MasterLessonDao();
		this.masterResourceDao = new MasterResourceDao();
		this.teacherLessonPlanDao = new TeacherLessonPlanDao();
		this.regenerateResourceLog = new RegeneratedLessonResourceDao();
		this.chapterDao = new ChapterDao();
		this.masterSubjectDao = new MasterSubjectDao();
		this.userDao = new UserDao();
		this.regeneratedLessonResourceDao = new RegeneratedLessonResourceDao()
	}

	async getActivityById(lessonId) {
        try {
            const lessonPlan = await this.masterLessonDao.generateLessonPlan(lessonId);
            if (!lessonPlan) {
                return formatApiReponse(false, "Lesson plan not found", null);
            }
            return formatApiReponse(true, "Activity ID retrieved successfully", lessonPlan);
        } catch (err) {
            console.error("Error --> MasterLessonManager -> getActivityId()", err);
            return formatApiReponse(false, err.message, err);
        }
    }

	async saveToTeacher(teacherId, data) {
		try {
			let teacher = await this.userDao.getById(teacherId);

			if (!teacher) {
				return formatApiReponse(false, "Invalid teacher id", null);
			}

			let content;
			let messageType;

			if (data?.lessonId) {
				content = await this.masterLessonDao.getById(data.lessonId);

				if (!content) {
					return formatApiReponse(false, "Invalid lesson id", null);
				}

				let lessonPlan = await this.teacherLessonPlanDao.getByTeacherAndLesson(
					teacher._id,
					data.lessonId
				);

				if (lessonPlan) {
					if (lessonPlan.isCompleted) {
						delete data.isCompleted;
					}

					let updatedPlan = await this.teacherLessonPlanDao.updatePlan(
						lessonPlan._id,
						data
					);

					if (updatedPlan) {
						messageType = lessonPlan.isCompleted
							? "Lesson Plan updated!"
							: data.isCompleted
							? "Lesson Plan updated to final version!"
							: "Lesson Plan saved as draft!";
						return formatApiReponse(true, messageType, updatedPlan);
					} else {
						return formatApiReponse(
							false,
							"Failed to update Lesson Plan",
							null
						);
					}
				}
			} else {
				content = await this.masterResourceDao.getById(data.resourceId);

				if (!content) {
					return formatApiReponse(false, "Invalid resource id", null);
				}

				let resourcePlan =
					await this.teacherLessonPlanDao.getByTeacherAndResource(
						teacher._id,
						data.resourceId
					);

				if (resourcePlan) {
					if (resourcePlan.isCompleted) {
						delete data.isCompleted;
					}

					let updatedPlan = await this.teacherLessonPlanDao.updatePlan(
						resourcePlan._id,
						data
					);

					if (updatedPlan) {
						messageType = resourcePlan.isCompleted
							? "Resource Plan updated!"
							: data.isCompleted
							? "Resource Plan updated to final version!"
							: "Resource Plan saved as draft!";
						return formatApiReponse(true, messageType, updatedPlan);
					} else {
						return formatApiReponse(
							false,
							"Failed to update Resource Plan",
							null
						);
					}
				}
			}

			let result = await this.teacherLessonPlanDao.saveToTeacher(
				teacherId,
				data
			);

			if (result) {
				messageType = data.isCompleted
					? `Saved Lesson ${
							data?.lessonId ? "Plan" : "Resource"
					  } as final version!`
					: `Saved Lesson ${data?.lessonId ? "Plan" : "Resource"} as draft!`;
				return formatApiReponse(true, messageType, result);
			}

			return formatApiReponse(
				false,
				`Failed to save Lesson ${data?.lessonId ? "Plan" : "Resource"}`,
				null
			);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async getByTeacher(teacherId, reqBody) {
		try {
			let data = await this.teacherLessonPlanDao.getByTeacher(
				teacherId,
				reqBody
			);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "", null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async update(req) {
		try {
			let data = await this.masterLessonDao.update(req.body);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "", null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async regenerateLessonPlan({ lessonId, reason, userId }) {
		try {
			const lessonPlan = await this.masterLessonDao.getById(lessonId);
			if (!lessonPlan) {
				return formatApiReponse(false, "Lesson plan not found", null);
			}

			const teacherLessonPlan =
				await this.teacherLessonPlanDao.getByTeacherAndLesson(userId, lessonId);
			if (!teacherLessonPlan) {
				return formatApiReponse(false, "Teacher's lesson plan not found", null);
			}

			const regeneratedContent = await regenerateLessonPlan();

			const newLessonPlan = {
				type: lessonPlan.type,
				class: lessonPlan.class,
				medium: lessonPlan.medium,
				semester: lessonPlan.semester,
				subject: lessonPlan.subject,
				teachingModel: lessonPlan.teachingModel,
				level: lessonPlan.level,
				instructionSet: regeneratedContent.instructionSet,
				learningOutcomes: regeneratedContent.learningOutcomes,
				videos: regeneratedContent.videos,
				documents: lessonPlan.documents,
				interactOutput: regeneratedContent.interactOutput,
			};

			const savedNewLessonPlan = await this.masterLessonDao.create(
				newLessonPlan
			);

			await this.teacherLessonPlanDao.update({
				teacherId: userId,
				oldLessonId: lessonId,
				newLessonId: savedNewLessonPlan._id,
				instructionSet: {},
			});

			const regeneratedLog = {
				contentId: lessonId,
				genContentId: savedNewLessonPlan._id,
				isLesson: true,
				reasons: reason,
				generatedBy: userId,
			};

			await this.regenerateResourceLog.create(regeneratedLog);

			return formatApiReponse(true, "", savedNewLessonPlan);
		} catch (err) {
			console.log("Error -> MasterLessonManager -> regenerateLessonPlan", err);
			return formatApiReponse(false, err?.message, err);
		}
	}

	async comboScript(board, medium, isAll) {
		try {
			const chapters = await Chapter.find({ board, medium });
			for (const chapter of chapters) {
				const subject = await this.masterSubjectDao.getById(chapter.subjectId);
				if (isAll) {
					const newLessonPlan = createData(
						true,
						chapter,
						chapter.subTopics,
						subject,
						isAll
					);
					await this.masterLessonDao.create(newLessonPlan);
				} else {
					for (const subTopic of chapter.subTopics) {
						const newLessonPlan = createData(
							true,
							chapter,
							subTopic,
							subject,
							isAll
						);
						await this.masterLessonDao.create(newLessonPlan);
					}
				}
			}
			return formatApiReponse(true, "", "Data inserted!");
		} catch (err) {
			console.log("Error -> MasterLessonManager -> ComboScript", err);
			return formatApiReponse(false, err?.message, err);
		}
	}

	async getLessonOutcomes(chapterId, filters) {
		try {
			let result = await this.masterLessonDao.getLessonOutcomes(
				chapterId,
				filters
			);

			result = sortDataBySubTopics(result);

			if (result) {
				return formatApiReponse(true, "", result);
			}

			return formatApiReponse(false, "No data available", null);
		} catch (err) {
			console.error(
				"Error --> MasterLessonManager -> getLessonOutcomes()",
				err
			);
			return formatApiReponse(false, err.message, err);
		}
	}

	async getFilteredQuestionBank(lessonId, filters) {
		const evalaute = await this.masterResourceDao.getOne({ lessonId });
		const questionBank = evalaute.resources.find(
			(resource) => resource.section === "questionbank"
		);
		let filterLevels = filters.levels || [];
		if (questionBank) {
			try {
				filterLevels = JSON.parse(filters.levels);
			} catch (error) {
				filterLevels = [];
			}

			if (!Array.isArray(filterLevels)) {
				filterLevels = [];
			}

			const filteredData =
				filterLevels.length > 0
					? questionBank.data.filter((item) =>
							filterLevels.includes(item.difficulty.toLowerCase())
					  )
					: questionBank.data;

			questionBank.data = filteredData;
		}
		return questionBank;
	}

	async generateLessonPlan(teacherId, lessonId, filters) {
        try {
            const lessonPlan = await this._getLessonPlan(teacherId, lessonId);

            const regeneratedMasterLessonPlan = await this._getRegeneratedMasterLessonPlan(teacherId, lessonId);

            if (regeneratedMasterLessonPlan) {
                const regeneratedRecord = await this._getRegeneratedRecord(regeneratedMasterLessonPlan.recordId);
                const regenerationStatusResponse = this._handleRegeneratedRecordStatus(regeneratedRecord);
                if (regenerationStatusResponse) return regenerationStatusResponse;
            }

            const draftResponse = this._handleDraft(lessonPlan);
            if (draftResponse) return draftResponse;

            const result = await this._generateLessonPlanResult(lessonId, filters);
            if (result) return result;

            return formatApiReponse(false, "No Data available", null);
        } catch (err) {
            console.error("Error --> MasterLessonManager -> generateLessonPlan()", err);
            return formatApiReponse(false, err.message, err);
        }
    }

	async generate5ETables(lessonId, userId , userName)
	{
		try {
			const masterLesson = await this.masterLessonDao.getById(lessonId);
			if (!masterLesson) {
				throw new Error(`Master lesson with ID ${payload.lessonId} not found`);
			  }
			const chapter = await this.chapterDao.getById(masterLesson.chapterId);
			if (!chapter) {
				throw new Error(`Chapter with ID ${masterLesson.chapterId} not found`);
			  }
			const subject = await this.masterSubjectDao.getById(chapter.subjectId);
			if (!subject) {
				throw new Error(`Subject with ID ${chapter.subjectId} not found`);
			  }

			const requestData = this._create5ETablePayload(chapter, subject, userId, userName , masterLesson);

			const result = await post5ETables(requestData);

			if (result.status !== 200 ) {
				logger.error(`Unexpected status code from Copilot bot: ${result.status}`);
				throw new Error(`Unexpected status code from Copilot bot: ${result.status}`);
			  }
			return formatApiReponse(true, "5E tables fetched succesfully",result.data);
		} catch (error) {
			logger.error('Error handling request', { message: error.message, stack: error.stack });
			return formatApiReponse(false, "Failed to generate the 5E table content", error);
		}
	}

    async _getLessonPlan(teacherId, lessonId) {
        return await this.teacherLessonPlanDao.getByTeacherAndLesson(teacherId, lessonId);
    }

    async _getRegeneratedMasterLessonPlan(teacherId, lessonId) {
        return await this.regeneratedLessonResourceDao.getOne({ generatedBy: teacherId, contentId: lessonId });
    }

    async _getRegeneratedRecord(recordId) {
        return await this.teacherLessonPlanDao.getById(recordId);
    }

    _handleRegeneratedRecordStatus(regeneratedRecord) {
        if (regeneratedRecord.status === 'running') {
            return formatApiReponse(false, "Regeneration for this combination is in progress!", regeneratedRecord);
        } else if (regeneratedRecord.status === 'completed') {
            return formatApiReponse(false, "This combination is already available in your profile!", regeneratedRecord);
        }
        return null;
    }

    _handleDraft(lessonPlan) {
        if (lessonPlan && !lessonPlan.isCompleted) {
            return formatApiReponse(false, "Draft Exists", lessonPlan);
        }
        if (lessonPlan) {
            return formatApiReponse(false, "Lesson Plan with this combination has already been saved!", lessonPlan);
        }
        return null;
    }

	_create5ETablePayload(chapter, subject, userId, userName , masterLesson) {
		return {
				user_info: {
					user_id: userId,
					user_name: userName,
				},
				lp_info: {
					id: `Board=${chapter.board},Medium=${chapter.medium},Grade=${chapter.standard},Subject=${subject.subjectName},Number=${chapter.orderNumber},Title=${chapter.topics}`,
					lp_level: masterLesson.isAll ? "CHAPTER" : "SUBTOPIC",
					grade: chapter.standard,
					subject: subject.subjectName,
					chapter_number: chapter.orderNumber,
					chapter_title: chapter.topics,
					topics: masterLesson.subTopics,
					learning_outcomes: masterLesson.learningOutcomes
				},
				output_lang: chapter.medium ===  "kannada" ? "kn" :"en",
				checklist: restructureCheckListforLLM(masterLesson.checkList)
				}
			}


    async _generateLessonPlanResult(lessonId, filters) {
        const result = await this.masterLessonDao.generateLessonPlan(lessonId, filters);

        if (result?.length > 0 && result[0].videos.length == 0 && filters["includeVideos"] === "true") {
            return formatApiReponse(false, "Video not found!", { hasVideos: false });
        }

        if (result) {
            let filteredQuestionBank = await this.getFilteredQuestionBank(lessonId, filters);

            let instructionSet = result[0].instructionSet.map((is) => {
                if (is.type === "Evaluate") {
                    is.info[0].content.main = filteredQuestionBank.data;    // Private methods
                }
                return is;
            });

            result[0].instructionSet = instructionSet;

            return formatApiReponse(true, "", result);
        }
        return null;
    }

	async scriptLpDump(req) {
		try {
			let lessonPlans = req.body;
			let failedLessonPlan = [];
			let createCount=0;
			let updateCount=0

			if (typeof lessonPlans === 'object' && !Array.isArray(lessonPlans)) {
                lessonPlans = [lessonPlans];
            }

			for (let i = 0; i < lessonPlans.length; i++) {
				let subjectName = lessonPlans[i].chapter_id.match(subjectRegex)[1];
				let title = lessonPlans[i].chapter_id.match(titleRegex)[1];
				let medium = lessonPlans[i].chapter_id.match(mediumRegex)[1];
				let board = lessonPlans[i].chapter_id.match(boardRegex)[1];
				let standard = lessonPlans[i].chapter_id.match(standardRegex)[1];
				let orderNumber = lessonPlans[i].chapter_id.match(orderNumberRegex)[1];

				let structuredInstructionSet = [];

				if (lessonPlans[i].lp_level == "SUBTOPIC") {
					structuredInstructionSet = restructureInstructionSet(
						lessonPlans[i].crisp_instruction_set
					);
				} else {
					structuredInstructionSet = restructureInstructionSet(
						lessonPlans[i].instruction_set
					);
				}
				let learningOutcomes = lessonPlans[i].learning_outcomes;
				if (typeof learningOutcomes[0] === 'string' && learningOutcomes[0].includes('\n')) {
				  learningOutcomes = learningOutcomes[0].split('\n').map(outcome => outcome.trim());
				}

				if(!lessonPlans[i]?.extracted_resources){
					failedLessonPlan.push(lessonPlans[i]);
					continue;
				}

				let chapter = await this.chapterDao.getOne({
					board,
					medium,
					orderNumber,
					topics: title,
					standard: Number(standard),
				});

				if (chapter && lessonPlans[i]?.index_path) {
                    chapter.indexPath= lessonPlans[i]?.index_path
                    await chapter.save();
                }

				if (!chapter?._id) {
					let subject = await this.masterSubjectDao.getByNameAndBoard(
						subjectName,
						board
					);
	
					if (!subject) {
						subject = await this.masterSubjectDao.create({
							subjectName,
							boards: [board],
							sem:getSemester(subjectName),
							name:formatSubject(subjectName)
						});
					}
	 
					let chapterObj = {
						subjectId: subject._id,
						topics: title,
						subTopics: lessonPlans[i].subtopics,
						medium: medium,
						board: board,
						standard: Number(standard),
						orderNumber: Number(orderNumber),
						indexPath:lessonPlans[i]?.index_path
					};
	 
					chapter = await this.chapterDao.create(chapterObj);
				}

				let queryingObj = {
					name: `${subjectName}-${board} Class${standard} ${title}`,
					class: Number(standard),
					board,
					medium,
					subject: subjectName,
					chapterId: chapter._id,
					subTopics: lessonPlans[i].subtopics,
					isRegenerated:false,
					isAll:lessonPlans[i].lp_level === 'CHAPTER'
				}

				const existingLp = await this.masterLessonDao.getOne(queryingObj);

				let lesson;
				if(existingLp && compareChapter(lessonPlans[i]._id,chapter,existingLp)){
					const lpQuery = {
						_id: existingLp._id,	
                        isDeleted: false,
					}

					const lpData = {
						instructionSet : structuredInstructionSet,
						learningOutcomes:lessonPlans[i]?.learning_outcomes,
						videos:lessonPlans[i]?.videos?.length ? lessonPlans[i]?.videos : [],
						checkList: restructureCheckList(lessonPlans[i].checklist)
					}
					lesson = await this.masterLessonDao.updateByFilter(lpQuery,lpData)

					const lrData = {
						resources: restructureResources(lessonPlans[i].extracted_resources),
						additionalResources: lessonPlans[i].additional_resources
							? restructureResources(lessonPlans[i].additional_resources)
							: [],
						learningOutcomes:lessonPlans[i]?.learning_outcomes,
					}
					await this.masterResourceDao.updateByFilter({lessonId:lesson._id},{lrData});
					updateCount+=1
				} else {
					let lessonPlanObj = {
						name: `${subjectName}-${board} Class${standard} ${title}`,
						class: Number(standard),
						isAll: lessonPlans[i].lp_level === "CHAPTER",
						board,
						medium,
						semester: "1",
						subject: subjectName,
						chapterId: chapter._id, //fetch id
						subTopics: lessonPlans[i].subtopics,
						teachingModel: [],
						instructionSet: structuredInstructionSet,
						videos: lessonPlans[i]?.videos?.length ? lessonPlans[i]?.videos : [],
						documents: [],
						learningOutcomes,
						interactOutput: lessonPlans[i].interact_output,
						preferredMot: lessonPlans[i].preferred_mot,
						checkList: restructureCheckList(lessonPlans[i].checklist),
						isRegenerated:false
					};

					lesson = await this.masterLessonDao.create(lessonPlanObj);

					let resourcePlanObj = {
						...lessonPlanObj,
						lessonId:lesson._id,
						lessonName: lessonPlanObj.name,
						resources: restructureResources(lessonPlans[i].extracted_resources),
						additionalResources: lessonPlans[i].additional_resources
							? restructureResources(lessonPlans[i].additional_resources)
							: [],
						checkList: restructureCheckList(lessonPlans[i].checklist),
					};
					await this.masterResourceDao.create(resourcePlanObj);
					createCount+=1
				}
			}

			return {
				success: true,
				message: "Data Added!",
				data: {
					createCount,
					updateCount,
					failCount: failedLessonPlan.length,
					failedLessonPlan,
				},
			};
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

}

module.exports = MasterLessonManger;

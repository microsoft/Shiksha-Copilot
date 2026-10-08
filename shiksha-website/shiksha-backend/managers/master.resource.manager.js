const BaseManager = require("./base.manager");
const MasterResourceDao = require("../dao/master.resource.dao");
const RegeneratedLessonResourceDao = require("../dao/regenerate.log.dao");
const formatApiResponse = require("../helper/response");
const regenerateLessonPlan = require("../services/copilot.bot.service");
const Chapter = require("../models/chapter.model");
const MasterSubjectDao = require("../dao/master.subject.dao");
const { createData, subjectRegex, titleRegex, mediumRegex, boardRegex, standardRegex, orderNumberRegex } = require("../helper/data.helper");
const { uniqueSubsets } = require("../helper/filter.helper");
const formatApiReponse = require("../helper/response");
const TeacherLessonPlanDao = require("../dao/teacher.lesson.plan.dao");
const { sortDataBySubTopics, transformSections, transformOldResources, getSemester, formatSubject } = require("../helper/formatter");
const ChapterDao = require("../dao/chapter.dao");
const LessonPlanTemplate = require("../models/lesson.plan.template.model");
const compareChapter = require("../helper/chapter.helper");
const { attachAggregateRatings } = require("../helper/activity.rating.helper");

class MasterResourceManager extends BaseManager {
	constructor() {
		super(new MasterResourceDao());
		this.masterResourceDao = new MasterResourceDao();
		this.teacherLessonPlanDao = new TeacherLessonPlanDao();
		this.regenerateResourceLog = new RegeneratedLessonResourceDao();
		this.masterSubjectDao = new MasterSubjectDao();
		this.chapterDao = new ChapterDao();
	}

	async updateMasterResource(id, updates) {
		try {
			const updatedResource = await this.masterResourceDao.update(id, updates);
			if (!updatedResource) {
				return formatApiResponse(false, "Master resource not found", null);
			}
			return formatApiResponse(true, "", updatedResource);
		} catch (err) {
			return formatApiResponse(false, err?.message, err);
		}
	}

	async regenerateResourcePlan({ resourceId, reason, userId }) {
		try {
			const resourcePlan = await this.masterResourceDao.getById(resourceId);
			if (!resourcePlan) {
				return formatApiResponse(false, "Resource plan not found", null);
			}

			const regeneratedResource = await regenerateLessonPlan();

			const newResourcePlan = {
				lessonName: resourcePlan.lessonName,
				class: resourcePlan.class,
				medium: resourcePlan.medium,
				board: resourcePlan.board,
				semester: resourcePlan.semester,
				subject: resourcePlan.subject,
				levels: resourcePlan.levels,
				topics: resourcePlan.topics,
				resources: regeneratedResource.resources,
			};

			const savedResourcePlan = await this.masterResourceDao.create(
				newResourcePlan
			);

			const regeneratedLog = {
				contentId: resourceId,
				genContentId: savedResourcePlan._id,
				isLesson: false,
				reasons: reason,
				generatedBy: userId,
			};

			await this.regenerateResourceLog.create(regeneratedLog);

			return formatApiResponse(
				true,
				"Resource plan generated successfully",
				savedResourcePlan
			);
		} catch (err) {
			console.log(
				"Error -> MasterResourceManager -> regenerateResourcePlan",
				err
			);
			return formatApiResponse(false, err?.message, err);
		}
	}

	async comboScript(board, medium) {
		try {
			const chapters = await Chapter.find({ board, medium });
			for (const chapter of chapters) {
				const subject = await this.masterSubjectDao.getById(chapter.subjectId);
				let subTopicSubSets = uniqueSubsets(chapter.subTopics);
				for (const subTopic of subTopicSubSets) {
					const newResourcePlan = createData(false, chapter, subTopic, subject);
					await this.masterResourceDao.create(newResourcePlan);
				}
			}
			return formatApiResponse(true, "", "Data inserted!");
		} catch (err) {
			console.log("Error -> MasterResourceManager -> ComboScript", err);
			return formatApiResponse(false, err?.message, err);
		}
	}

	async getSubtopicResourceList(chapterId,templateIds) {
		try {
			let result = await this.masterResourceDao.getSubtopicResourceList(
				chapterId,
				templateIds
			);

			result = sortDataBySubTopics(result);

			if (result) {
				return formatApiReponse(true, "", result);
			}

			return formatApiResponse(true, "", result);
		} catch (err) {
			console.log(
				"Error -> MasterResourceManager -> getSubtopicResourceList",
				err
			);
			return formatApiResponse(false, err?.message, err);
		}
	}

	async generateResourcePlan(teacherId, resourceId, filters) {
		try {
			const resourcePlan =
				await this.teacherLessonPlanDao.getByTeacherAndResource(
					teacherId,
					resourceId
				);

			if (resourcePlan && !resourcePlan.isCompleted) {
				return formatApiReponse(false, "Draft Exists", resourcePlan);
			}

			if (resourcePlan) {
				return formatApiReponse(
					false,
					"Lesson Resource Plan with this combination has already been saved!",
					resourcePlan
				);
			}

			const result = await this.masterResourceDao.generateResourcePlan(
				resourceId,
				filters
			);

			if (result) {
				const ratingAttachedResourcePlan = await attachAggregateRatings(result,resourceId);
				return formatApiReponse(true, "", ratingAttachedResourcePlan);
			}

			return formatApiReponse(false, "No Data available", null);
		} catch (err) {
			console.error(
				"Error --> MasterResourceManager -> generateResourcePlan()",
				err
			);
			return formatApiReponse(false, err.message, err);
		}
	}



	async uploadMasterResources(req) {
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
				let learningOutcomes = lessonPlans[i].learning_outcomes;
				let templateDetails = await LessonPlanTemplate.find({workFlowId:lessonPlans[i]?.workflow_id});
				let templateId = templateDetails[0]?._id || null;

				if (typeof learningOutcomes[0] === 'string' && learningOutcomes[0].includes('\n')) {
				  learningOutcomes = learningOutcomes[0].split('\n').map(outcome => outcome.trim());
				}

				if(!templateId){
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

				let subject = await this.masterSubjectDao.getByNameAndBoard(
						subjectName,
						board
				);
				if (!chapter?._id) {
					if (!subject) {
						let subjectData = await this.masterSubjectDao.getOne({subjectName});
						if (subjectData && !subjectData.boards.includes(board)) {
							subjectData.boards.push(board);
							subjectData.applicableClasses.push(
								{
										board: board,
										Classes: [standard]
									}
							)
							subject = await subjectData.save(); 
						  }else{
							subject = await this.masterSubjectDao.create({
								subjectName,
								boards: [board],
								sem:getSemester(subjectName),
								name:formatSubject(subjectName),
								applicableClasses: [
									{
										board: board,
										Classes: [standard]
									}
									]
							});
						  }
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

				let boardEntry = subject.applicableClasses.find(
    				(entry) => entry.board === board
  					);

				if (boardEntry) {
					if (!boardEntry.classes.includes(standard)) {
					boardEntry.classes.push(standard);
					await subject.save();
					}
				} else {
					subject.applicableClasses.push({
					board: board,
					classes: [standard]
					});

					if (!subject.boards.includes(board)) {
					subject.boards.push(board);
					}

					await subject.save();
				}


				let queryingObj = {
					lessonName: `${subjectName}-${board} Class${standard} ${title}`,
					class: Number(standard),
					board,
					medium,
					subject: subjectName,
					chapterId: chapter._id,
					subTopics: lessonPlans[i].subtopics,
					isAll:lessonPlans[i].lp_level === 'CHAPTER',
					templateId
				}

				const existingLr = await this.masterResourceDao.getOne(queryingObj);

				let resource;

				const transformedResource = transformSections(lessonPlans[i]?.sections, templateDetails[0]?.sections);
				
				if(existingLr && compareChapter(lessonPlans[i]._id,chapter,existingLr)){
					const lrQuery = {
						_id: existingLr._id,	
					}


					const lrData = {
						resources:transformedResource,
						learningOutcomes:lessonPlans[i]?.learning_outcomes,
					}

					resource = await this.masterResourceDao.updateByFilter(lrQuery,lrData)
					updateCount+=1
				} else {
					let resourcePlanObj = {
						lessonName: `${subjectName}-${board} Class${standard} ${title}`,
						class: Number(standard),
						isAll: lessonPlans[i].lp_level === "CHAPTER",
						board,
						medium,
						semester: "1",
						subject: subjectName,
						chapterId: chapter._id, //fetch id
						subTopics: lessonPlans[i].subtopics,
						resources:transformedResource,
						learningOutcomes,
						templateId
					};
					resource = await this.masterResourceDao.create(resourcePlanObj);
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

	async uploadOldMasterResources(req) {
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
				let learningOutcomes = lessonPlans[i].learning_outcomes;
				let templateDetails = await LessonPlanTemplate.find({workFlowId:'karnataka-additional-resources'});
				let templateId = templateDetails[0]?._id || null;

				if(board !== 'KSEEB'){
					failedLessonPlan.push(lessonPlans[i]);
					continue;
				}

				if (typeof learningOutcomes[0] === 'string' && learningOutcomes[0].includes('\n')) {
				  learningOutcomes = learningOutcomes[0].split('\n').map(outcome => outcome.trim());
				}

				if(!templateId){
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
			let subject = await this.masterSubjectDao.getByNameAndBoard(
						subjectName,
						board
					);
				if (!chapter?._id) {
					if (!subject) {
						let subjectData = await this.masterSubjectDao.getOne({subjectName});
						if (subjectData && !subjectData.boards.includes(board)) {
							subjectData.boards.push(board);
							subjectData.applicableClasses.push(
								{
										board: board,
										Classes: [standard]
									}
							)
							subject = await subjectData.save(); 
						  }else{
							subject = await this.masterSubjectDao.create({
								subjectName,
								boards: [board],
								sem:getSemester(subjectName),
								name:formatSubject(subjectName),
								applicableClasses: [
									{
										board: board,
										Classes: [standard]
									}
									]
							});
						  }
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

				let boardEntry = subject.applicableClasses.find(
    				(entry) => entry.board === board
  					);

					if (boardEntry) {
						if (!boardEntry.classes.includes(standard)) {
						boardEntry.classes.push(standard);
						await subject.save();
						}
					} else {
						subject.applicableClasses.push({
						board: board,
						classes: [standard]
						});

						if (!subject.boards.includes(board)) {
						subject.boards.push(board);
						}

						await subject.save();
					}


				let queryingObj = {
					lessonName: `${subjectName}-${board} Class${standard} ${title}`,
					class: Number(standard),
					board,
					medium,
					subject: subjectName,
					chapterId: chapter._id,
					subTopics: lessonPlans[i].subtopics,
					isAll:lessonPlans[i].lp_level === 'CHAPTER',
					templateId
				}

				const existingLr = await this.masterResourceDao.getOne(queryingObj);

				let resource;

				const {extracted,additional} = transformOldResources(lessonPlans[i]?.extracted_resources, lessonPlans[i]?.additional_resources);
				
				if(existingLr && compareChapter(lessonPlans[i]._id,chapter,existingLr)){
					const lrQuery = {
						_id: existingLr._id,	
					}


					const lrData = {
						resources:extracted,
						additionalResources:additional,
						learningOutcomes:lessonPlans[i]?.learning_outcomes,
					}

					resource = await this.masterResourceDao.updateByFilter(lrQuery,lrData)
					updateCount+=1
				} else {
					let resourcePlanObj = {
						lessonName: `${subjectName}-${board} Class${standard} ${title}`,
						class: Number(standard),
						isAll: lessonPlans[i].lp_level === "CHAPTER",
						board,
						medium,
						semester: "1",
						subject: subjectName,
						chapterId: chapter._id,
						subTopics: lessonPlans[i].subtopics,
						resources:extracted,
						additionalResources:additional,
						learningOutcomes,
						templateId
					};
					resource = await this.masterResourceDao.create(resourcePlanObj);
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

module.exports = MasterResourceManager;

const ChapterDao = require("../dao/chapter.dao");
const QuestionBankDao = require("../dao/question.bank.dao");
const formatApiReponse = require("../helper/response");
const {
  postToQuestionBankTemplate,
  postToQuestionBankBluePrint,
  postToQuestionBankParts,
} = require("../services/question.bank.bot.service");
const BaseManager = require("./base.manager");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const chapterAggregation = require("../aggregation/chapter.aggregation");
const { convertToCamelCase } = require("../helper/formatter");
const QuestionBankCacheDao = require("../dao/question.bank.cache.dao");
const {
  getQuestions,
  filterTemplate,
  mergeQuestions,
  processCacheHits,
  processCacheHitsForSubtopic,
} = require("../helper/question.bank.cache.helper");
const QuestionBankCacheSummaryDao = require("../dao/question.bank.cache.summary.dao");
const { addCacheJob } = require("./cache.queue.manager");
const QuestionBankCacheSummary = require("../models/question.bank.cache.summary.model");

class QuestionBankManager extends BaseManager {
  constructor() {
    super(new QuestionBankDao());
    this.chapterDao = new ChapterDao();
    this.questionBankDao = new QuestionBankDao();
    this.questionBankCacheDao = new QuestionBankCacheDao();
    this.questionBankCacheSummaryDao = new QuestionBankCacheSummaryDao();
  }

  async getTeacherQuestionPapers(
    teacherId,
    page = 1,
    limit,
    filters = {},
    sort = {}
  ) {
    try {
      let data = await this.questionBankDao.getTeacherQuestionPapers(
        teacherId,
        page,
        limit,
        filters,
        sort
      );
      return formatApiReponse(true, "", data);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async generateQuestionBankTemplate(req, user) {
    try {
      const payload = await this._createQuestionBankPayload(req.body, user);

      const response = await postToQuestionBankTemplate(payload);

      if (response.status !== 200) {
        throw new Error(`Something went wrong with copilot! Please try later`);
      }

      if (!response.data) {
        throw new Error("Something went wrong with copilot! Please try later");
      }

      const templateData = response.data;

      return formatApiReponse(
        true,
        "Question bank template generated successfully!",
        templateData
      );
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async generateQuestionBankBluePrint(req, user) {
    try {
      const { objective_distribution, template } = req.body;

      const templatePayload = await this._createQuestionBankPayload(
        req.body,
        user
      );

      const payload = {
        ...templatePayload,
        objective_distribution,
        template,
      };

      const response = await postToQuestionBankBluePrint(payload);

      if (response.status !== 200) {
        throw new Error(`Something went wrong with copilot! Please try later`);
      }

      if (!response.data) {
        throw new Error("Something went wrong with copilot! Please try later");
      }

      const bluePrintData = response.data;

      return formatApiReponse(
        true,
        "Question bank blue print generated successfully!",
        bluePrintData
      );
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async generateQuestionBank(req, user) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        chapter,
        subTopic,
        isMultiChapter,
        chapterIds,
        objectiveDistribution,
        questionBankTemplate,
        template,
      } = req.body;

      const unitLevel = isMultiChapter ? "CHAPTER" : "SUBTOPIC";

      const unitNames = isMultiChapter ? chapter : subTopic;
      
      const processedUnitNames = unitNames.map((e)=>e.trim());

      const chapterIdsArr = isMultiChapter ? chapterIds : [chapterIds];

      const cacheHit = await this.questionBankCacheDao.findInCache(
        chapterIdsArr,
        unitLevel,
        processedUnitNames
      );

      const rawCacheHit = cacheHit.map((doc) => doc.toObject());

      const {
        matchTheFollowingTemplate,
        matchTheFollowingIndex,
        filteredTemplate,
      } = filterTemplate(template);

      const [res, notFoundRes, notFoundIndices, cacheSummary] =
        await getQuestions(filteredTemplate, cacheHit);

      const notFoundQuestions = structuredClone(notFoundRes);

      const templatePayload = await this._createQuestionBankPayload(
        req.body,
        user
      );

      if (matchTheFollowingTemplate.length) {
        for (let i = 0; i < matchTheFollowingTemplate.length; i++) {
          notFoundRes.splice(
            matchTheFollowingIndex[i],
            0,
            matchTheFollowingTemplate[i]
          );
        }
      }

      let mergedList;
      let newResQuestions;
      if(notFoundRes.length){
        const payload = {
          ...templatePayload,
          template: notFoundRes,
          existing_questions: res,
        };
  
        const response = await postToQuestionBankParts(payload);
  
        if (response.status !== 200) {
          throw new Error(`Something went wrong with copilot! Please try later`);
        }
  
        if (!response.data) {
          throw new Error("Something went wrong with copilot! Please try later");
        }
  
        let newQuestions = response.data;
  
        const filteredQuestions = filterTemplate(newQuestions.questions);
  
        newResQuestions = filteredQuestions.filteredTemplate;
  
        mergedList = mergeQuestions(res, newResQuestions, notFoundIndices);
  
        if (filteredQuestions.matchTheFollowingTemplate.length) {
          for (
            let i = 0;
            i < filteredQuestions.matchTheFollowingTemplate.length;
            i++
          ) {
            mergedList.splice(
              filteredQuestions.matchTheFollowingIndex[i],
              0,
              filteredQuestions.matchTheFollowingTemplate[i]
            );
          }
        }
      }else{
        mergedList = res;
      }

      let questionBankData = {
        metadata: {
          schoolName: user?.school?.name,
        },
        questions: [],
      };
      questionBankData.questions = convertToCamelCase(mergedList);

      const questionBank = await this.questionBankDao.saveQuestionBank(
        questionBankData
      );

      let config = templatePayload;
      delete config.user_id;
      delete config.chapters;

      const userId = user._id;

      let configData = convertToCamelCase({
        ...config,
        chapterIds,
        isMultiChapter,
        questionBankTemplate,
        bluePrintTemplate: template,
        objectiveDistribution,
      });

      configData.teacherId = new ObjectId(userId);
      configData.questionBank = new ObjectId(questionBank._id);
      configData.topics = processedUnitNames
      const questionBankConfig = await this.questionBankDao.create(configData);

      if (notFoundQuestions.length) {
        const objectives = objectiveDistribution.map((e) =>
          e.objective.toLowerCase()
        );

        const processedCache = isMultiChapter
          ? processCacheHits(
              rawCacheHit,
              chapterIds,
              processedUnitNames,
              unitLevel,
              objectives
            )
          : processCacheHitsForSubtopic(
              rawCacheHit,
              chapterIds,
              processedUnitNames,
              unitLevel,
              objectives
            );

        let cacheSummaryData = convertToCamelCase({
          questionBankConfigId: questionBankConfig._id,
          totalQuestionsToFindInCache: cacheSummary.totalDecisions,
          cacheHit: cacheSummary.cacheHitCount,
          cacheMiss: cacheSummary.cacheMissCount,
          notFoundResponse: newResQuestions,
          processedCache,
          unitLevel,
        });

        cacheSummaryData.notFoundQuestions = notFoundQuestions;

        const summary = await this.questionBankCacheSummaryDao.create(
          cacheSummaryData
        );

        addCacheJob({
          notFoundQuestions,
          processedCache,
          unitLevel,
          newResQuestions,
          cacheSummaryId: summary._id.toString(),
        }).catch((err) => {
          console.error("Failed to enqueue cache update job", err);
        });
      }else{
        let cacheSummaryData = convertToCamelCase({
          questionBankConfigId: questionBankConfig._id,
          totalQuestionsToFindInCache: cacheSummary.totalDecisions,
          cacheHit: cacheSummary.cacheHitCount,
          cacheMiss: cacheSummary.cacheMissCount,
          unitLevel,
          isCacheUpdated:true
        });

        await this.questionBankCacheSummaryDao.create(
          cacheSummaryData
        );
      }

      await session.commitTransaction();
      return formatApiReponse(
        true,
        "Question bank generated successfully!",
        questionBankConfig
      );
    } catch (err) {
      await session.abortTransaction();
      return formatApiReponse(false, err?.message, err);
    } finally {
      session.endSession();
    }
  }

  async _createQuestionBankPayload(reqBody, user) {
    try {
      const {
        board,
        medium,
        grade,
        subject,
        examinationName,
        chapterIds,
        subTopic,
        totalMarks,
        isMultiChapter,
        marksDistribution,
      } = reqBody;

      const userId = user._id;
      let payload = {
        user_id: userId,
        board,
        medium,
        grade,
        subject,
        chapters: [],
        school_name: user?.school?.name,
        examination_name: examinationName,
        total_marks: totalMarks,
        marks_distribution: marksDistribution,
      };

      if (isMultiChapter) {
        const chapterData =
          await chapterAggregation.getChapterByIdsAndFilterObject(chapterIds);
        payload.chapters = chapterData;
      } else {
        const chapterData =
          await chapterAggregation.getChapterByIdAndSubtopicFilter(
            chapterIds,
            subTopic
          );
        payload.chapters = chapterData;
      }

      return payload;
    } catch (e) {
      return e;
    }
  }

  async updateFeedback(questionBankId, feedbackData) {
    try {
      await this.questionBankDao.update(questionBankId, feedbackData);
      return formatApiReponse(true, "Feedback submitted successfully", null);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async retryFailedJobs() {
    try {
      console.log("Running retry for failed cache updates...");
      const failedJobs = await QuestionBankCacheSummary.find({
        isCacheUpdated: false,
        inProgress: false,
      });

      const jobsToProcess = failedJobs.map((doc) => doc.toObject());

      for (const job of jobsToProcess) {
        const {
          notFoundQuestions,
          processedCache,
          unitLevel,
          notFoundResponse,
        } = job;

        addCacheJob({
          notFoundQuestions,
          processedCache,
          unitLevel,
          newResQuestions: notFoundResponse,
          cacheSummaryId: job._id.toString(),
        });
      }
      return formatApiReponse(true, "Failed job processing initiated", null);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async retryFailedJob(jobId) {
    try {
      console.log(`Running retry for failed job-${jobId}`);
      let failedJob = await QuestionBankCacheSummary.findById(jobId);
      failedJob = failedJob.toObject();

      const { notFoundQuestions, processedCache, unitLevel, notFoundResponse } =
        failedJob;

      addCacheJob({
        notFoundQuestions,
        processedCache,
        unitLevel,
        newResQuestions: notFoundResponse,
        cacheSummaryId: failedJob._id.toString(),
      });

      return formatApiReponse(
        true,
        `Failed job-${jobId} processing initiated`,
        null
      );
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }
}

module.exports = QuestionBankManager;

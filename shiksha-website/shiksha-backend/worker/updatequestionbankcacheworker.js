const { parentPort } = require("worker_threads");
const dbService = require("../config/db.js");
const {
  createQuestionObj,
  preprocess,
  generateHash,
  findMostSimilar,
  fixObjectIdsInArray,
} = require("../helper/question.bank.cache.helper");
const {
  postToEmbedding,
  postToEmbeddings,
} = require("../services/question.bank.bot.service");
const QuestionBankEmbedding = require("../models/question.bank.embedding.model.js");
const QuestionBankCache = require("../models/question.bank.cache.model.js");
const QuestionBankCacheSummary = require("../models/question.bank.cache.summary.model.js");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateEmbeddings = async (questionsToEmbed) => {
  try {
    const payloads = [];
    const bulkEmbedding = [];
    for (let i = 0; i < questionsToEmbed.length; i++) {
      payloads.push({
        text: questionsToEmbed[i],
      });

      const hashVal = generateHash(questionsToEmbed[i]);

      const embeddingObj = {
        _id: hashVal,
        text: questionsToEmbed[i],
        embeddings: [],
      };

      bulkEmbedding.push(embeddingObj);
    }

    const responses = await postToEmbeddings(payloads);

    if (!responses) {
      throw new Error("Something went wrong with copilot! Please try later");
    }

    responses.forEach((e, i) => {
      bulkEmbedding[i].embeddings = e;
    });

    const incomingIds = bulkEmbedding.map((doc) => doc._id);
    const existingDocs = await QuestionBankEmbedding.find(
      { _id: { $in: incomingIds } },
      { _id: 1 }
    );
    const existingIds = new Set(existingDocs.map((doc) => doc._id.toString()));
    const newEmbeddings = bulkEmbedding.filter(
      (doc) => !existingIds.has(doc._id.toString())
    );

    await QuestionBankEmbedding.insertMany(newEmbeddings, { ordered: false });
  } catch (err) {
    console.log(err);
    throw new Error("Error update embeddings", err.message);
  }
};

const checkSimilarity = async (cacheQuestions, currQuestion) => {
  try {
    const processedQuestion = preprocess(currQuestion.question);
    const response = await postToEmbedding({ text: processedQuestion });

    if (response.status !== 200) {
      throw new Error(`Something went wrong with copilot! Please try later`);
    }

    if (!response.data) {
      throw new Error("Something went wrong with copilot! Please try later");
    }

    const currQuestionEmbedding = response.data;

    const embeddingIds = cacheQuestions.map((e) =>
      generateHash(preprocess(e.question.question))
    );

    const embeddingDocs = await QuestionBankEmbedding.find({
      _id: { $in: embeddingIds },
    });

    const formattedEmbeddings = embeddingDocs.map((doc) => doc.toObject());

    const embeddings = formattedEmbeddings.map((e) => e.embeddings);

    const [idx, simiScore] = findMostSimilar(embeddings, currQuestionEmbedding);

    return { simiScore, currQuestionEmbedding };
  } catch (err) {
    throw new Error("Error checkSimilarity", err.message);
  }
};

const updateCache = async (newCache) => {
  try {
    const result = await Promise.all(
      newCache.map(async (doc) => {
        if (doc._id) {
          return await QuestionBankCache.findByIdAndUpdate(
            doc._id,
            {
              $set: {
                questionsByObjective: doc.questionsByObjective,
              },
            },
            {
              new: true,
              runValidators: true,
            }
          );
        } else {
          const newDoc = new QuestionBankCache(doc);
          return await newDoc.save();
        }
      })
    );
    return result;
  } catch (err) {
    console.log(
      "Error --> updatequestionbankcacheworker -> updateCache() 🚀",
      err
    );
    throw new Error("updateCache", err.message);
  }
};

parentPort.on("message", async (data) => {
  let client;
  let openedHere = false;
  try {
    const connection = await dbService.connectToMongoForWorker();
    client = connection.client;
    openedHere = connection.openedHere;

    const {
      notFoundQuestions,
      processedCache,
      unitLevel,
      newResQuestions,
      cacheSummaryId,
    } = data;

    await QuestionBankCacheSummary.findByIdAndUpdate(cacheSummaryId, {
      inProgress: true,
    });

    if (notFoundQuestions.length) {
      const questionsToEmbed = [];
      for (let i = 0; i < notFoundQuestions.length; i++) {
        let currObj = {};
        currObj.type = notFoundQuestions[i].type;
        currObj.marksPerQuestion = notFoundQuestions[i].marks_per_question;
        const qDistribution = notFoundQuestions[i].question_distribution;
        for (let j = 0; j < qDistribution.length; j++) {
          currObj.unitName = qDistribution[j].unit_name;
          currObj.objective = qDistribution[j].objective.toLowerCase();

          let cache = processedCache.filter(
            (ele) =>
              ele.unitName === currObj.unitName && ele.unitLevel === unitLevel
          );

          let cacheByObjective =
            cache[0].questionsByObjective[currObj.objective];

          const cacheQuestions = cacheByObjective.filter(
            (e) =>
              e.type === currObj.type && e.marks === currObj.marksPerQuestion
          );
          const cacheQuestionsPerType =
            parseInt(process.env.CACHE_QUESTION_PER_TYPE) || 10;
          if (
            cacheQuestions.length &&
            cacheQuestions.length < cacheQuestionsPerType
          ) {
            const { simiScore, currQuestionEmbedding } = await checkSimilarity(
              cacheQuestions,
              newResQuestions[i].questions[j]
            );
            const simiThreshold =
              parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.9;
            if (simiScore < simiThreshold) {
              const newQuestion = createQuestionObj(
                currObj.type,
                currObj.marksPerQuestion,
                newResQuestions[i].questions[j]
              );
              cacheByObjective.push(newQuestion);
              const processedQuestion = preprocess(
                newResQuestions[i].questions[j].question
              );
              const hashId = generateHash(processedQuestion);
              const embeddingObj = {
                _id: hashId,
                text: processedQuestion,
                embeddings: currQuestionEmbedding,
              };

              const exists = await QuestionBankEmbedding.exists({
                _id: hashId,
              });
              if (!exists) {
                await QuestionBankEmbedding.create(embeddingObj);
              }
            }
            await delay(1000);
          } else {
            const newQuestion = createQuestionObj(
              currObj.type,
              currObj.marksPerQuestion,
              newResQuestions[i].questions[j]
            );
            questionsToEmbed.push(
              preprocess(newResQuestions[i].questions[j].question)
            );
            cacheByObjective.push(newQuestion);
          }
        }
      }

      const cacheToUpdate = fixObjectIdsInArray(processedCache);

      if (questionsToEmbed.length) {
        await updateEmbeddings(questionsToEmbed);
      }

      const updatedCache = await updateCache(cacheToUpdate);

      parentPort.postMessage({
        success: true,
        cacheSummaryId,
      });
    }
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: err.message,
      cacheSummaryId: data.cacheSummaryId,
    });
  } finally {
    if (openedHere && client) {
      await client.close();
    }
  }
});

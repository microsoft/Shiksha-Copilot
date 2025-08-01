const crypto = require("crypto");
const questionBankEmbedding = require("../models/question.bank.embedding.model");
const mongoose = require("mongoose");

function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce(
    (sum, value, idx) => sum + value * vec2[idx],
    0
  );
  const magnitude1 = Math.sqrt(
    vec1.reduce((sum, value) => sum + value * value, 0)
  );
  const magnitude2 = Math.sqrt(
    vec2.reduce((sum, value) => sum + value * value, 0)
  );
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Function to find similarity between list of embedding and new embedding
 * @param {*} A_LIST 
 * @param {*} B 
 * @returns similarity score
 */
function findMostSimilar(A_LIST, B) {
  const similarities = A_LIST.map((embedding) =>
    cosineSimilarity(embedding, B)
  );
  const maxIndex = similarities.indexOf(Math.max(...similarities));
  return [maxIndex, similarities[maxIndex]];
}

/**
 * Function to generate hash useing sha256
 * @param {*} inputStr 
 * @returns hash value of the inputstr
 */
function generateHash(inputStr) {
  return crypto.createHash("sha256").update(inputStr).digest("hex");
}

/**
 * Function to pre process text, remove space and convert to lowercase
 * @param {*} text 
 * @returns preprocessed text
 */
function preprocess(text) {
  return text
    .replace(/[^a-zA-Z\s]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Function to filter the template with match the following type
 * @param {*} qbConfigList 
 * @returns 
 */
function filterTemplate(qbConfigList) {
  const filteredTemplate = [];
  const matchTheFollowingTemplate = [];
  const matchTheFollowingIndex = [];
  for (let i = 0; i < qbConfigList.length; i++) {
    if (qbConfigList[i].type === "Match the following") {
      matchTheFollowingTemplate.push(qbConfigList[i]);
      matchTheFollowingIndex.push(i);
    } else {
      filteredTemplate.push(qbConfigList[i]);
    }
  }
  return {
    matchTheFollowingTemplate,
    matchTheFollowingIndex,
    filteredTemplate,
  };
}

/**
 * Function GetQuestion - Function to get question from the cache based on the template provided
 * @param {*} templateList 
 * @param {*} cacheDocs 
 * @returns question from cache, not found template, not found index, cache summary
 */
async function getQuestions(templateList, cacheDocs) {
try{
  let res = [];
  let notFoundRes = [];
  let notFoundIndices = [];
  let includedQuestions = [];

  const simiThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.9;
  const CACHE_USAGE_RATE = parseFloat(process.env.CACHE_USAGE_RATE) || 0.9;

  const shouldUseCache = () => Math.random() <= CACHE_USAGE_RATE;

  let totalDecisions = 0;
  let cacheHitCount = 0;
  let cacheMissCount = 0;

  for (const template of templateList) {
    const questionTypeResponse = new QuestionTypeResponse(
      template.type,
      template.marks_per_question
    );

    let notFoundTemplate = { ...template };
    notFoundTemplate.question_distribution = [];
    notFoundTemplate.number_of_questions = 0;
    let notFoundQuestionIndices = [];

    const questionDistribution = template.question_distribution;

    for (let i = 0; i < questionDistribution.length; i++) {
      totalDecisions++;

      const unitName = questionDistribution[i].unit_name.toLowerCase().trim();
      const objective = questionDistribution[i].objective.toLowerCase();

      if (!shouldUseCache()) {
        cacheMissCount++;
        notFoundTemplate.question_distribution.push(questionDistribution[i]);
        notFoundQuestionIndices.push(i);
        continue;
      }

      let questionToInclude = [];
      let embedingsToInclude = [];
      let foundQuestion = false;

      for (const cacheDoc of cacheDocs) {
        if (
          cacheDoc.unitName.toLowerCase() === unitName &&
          cacheDoc.questionsByObjective[objective] &&
          objective in cacheDoc.questionsByObjective
        ) {
          const questionList = cacheDoc.questionsByObjective[objective];

          for (const questionInCache of questionList) {
            if (
              questionInCache.type === template.type &&
              questionInCache.marks === template.marks_per_question
            ) {
              const questionText = preprocess(
                questionInCache.question.question
              );

              const questionHash = generateHash(questionText);

              const embDocs = await questionBankEmbedding.findById(
                questionHash
              );
              if (!embDocs) continue;

              const emb = embDocs["embeddings"];

              let shouldInclude = true;
              const allEmbeddedQuestions = [
                ...includedQuestions,
                ...embedingsToInclude,
              ];

              if (allEmbeddedQuestions.length > 0) {
                const [idx, simiScore] = findMostSimilar(
                  allEmbeddedQuestions.map((item) => item[1]),
                  emb
                );
                if (simiScore > simiThreshold) {
                  shouldInclude = false;
                }
              }

              if (shouldInclude) {
                embedingsToInclude.push([questionInCache, emb]);
                questionToInclude.push(questionInCache.question);
                foundQuestion = true;
              }
            }
          }
        }
      }

      if (questionToInclude.length > 0) {
        cacheHitCount++;
        const randomIndex = getRandomIndex(questionToInclude);
        questionTypeResponse.questions.push(questionToInclude[randomIndex]);
        includedQuestions.push(embedingsToInclude[randomIndex]);
      }

      if (!foundQuestion) {
        cacheMissCount++;
        notFoundTemplate.question_distribution.push(questionDistribution[i]);
        notFoundQuestionIndices.push(i);
      }
    }

    questionTypeResponse.number_of_questions =
      questionTypeResponse.questions.length;
    res.push(questionTypeResponse.modelDump());

    notFoundTemplate.number_of_questions =
      notFoundTemplate.question_distribution.length;

    if (notFoundTemplate.number_of_questions > 0) {
      notFoundRes.push(notFoundTemplate);
      notFoundIndices.push({
        type: notFoundTemplate.type,
        indices: notFoundQuestionIndices,
      });
    } else if(notFoundTemplate.number_of_questions === 0){
      notFoundIndices.push({})
    }
  }

  const hitPercent = ((cacheHitCount / totalDecisions) * 100).toFixed(2);
  const missPercent = ((cacheMissCount / totalDecisions) * 100).toFixed(2);

  console.log(`📊 Cache Summary:`);
  console.log(`- Total Questions: ${totalDecisions}`);
  console.log(`- Cache Hits: ${cacheHitCount} (${hitPercent}%)`);
  console.log(`- Cache Misses/API Calls: ${cacheMissCount} (${missPercent}%)`);

  const cacheSummary = {
    totalDecisions,
    cacheHitCount,
    cacheMissCount
  }

  return [res, notFoundRes, notFoundIndices,cacheSummary];
}
catch(err){
  throw new Error("Error getting question from cache", err.message);
}
}

/**
 * Function to get random index of an array
 * @param {*} array 
 * @returns random index
 */
function getRandomIndex(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return randomIndex;
}

/**
 * Function to merge existing question with new question based on the indices
 * @param {*} existingQuestions 
 * @param {*} newQuestions 
 * @param {*} indices 
 * @returns merged list of questions
 */
function mergeQuestions(existingQuestions,newQuestions,indices) {
  const paddedNewQuestions = [];
  let newQuestionPointer = 0;

  for (let i = 0; i < indices.length; i++) {
    if (Object.keys(indices[i]).length === 0) {
      paddedNewQuestions.push({});
    } else {
      paddedNewQuestions.push(newQuestions[newQuestionPointer]);
      newQuestionPointer++;
    }
  }

  for (let i = 0; i < existingQuestions.length; i++) {
    const currentIndices = indices[i];
    const newBlock = paddedNewQuestions[i];
    const existingBlock = existingQuestions[i];

    if (!currentIndices || Object.keys(currentIndices).length === 0) continue;

    if (existingBlock.type !== currentIndices.type) {
      console.error(
        `Type mismatch at index ${i}:\nExpected: ${existingBlock.type}\nReceived: ${currentIndices.type}`
      );
      continue;
    }

    if (!newBlock || !newBlock.questions || !existingBlock.questions) {
      console.warn(`Invalid block or missing questions at index ${i}`);
      continue;
    }

    const insertIndices = currentIndices.indices;
    const newQuestionsToInsert = newBlock.questions;

    if (insertIndices.length !== newQuestionsToInsert.length) {
      console.error(
        `Index mismatch at position ${i}: expected ${insertIndices.length}, got ${newQuestionsToInsert.length}`
      );
      continue;
    }

    insertIndices.forEach((insertIndex, idx) => {
      const question = newQuestionsToInsert[idx];
      existingBlock.questions.splice(insertIndex, 0, question);
    });

    existingBlock.number_of_questions += newQuestionsToInsert.length;
  }

  return existingQuestions;
}


function createQuestionObj(type, marks, questionObj) {
  let question;

  if (
    type ===
    "Four alternatives are given for each of the following questions, choose the correct alternative"
  ) {
    question = {
      question: questionObj.question || "",
      options: questionObj.options || [],
      answer: questionObj.answer || "",
    };
  } else {
    question = {
      question: questionObj.question || "",
    };
  }

  return {
    question,
    marks,
    type,
  };
}

function fixId(idObj) {
  if (idObj?.buffer && typeof idObj.buffer === "object") {
    const bufferArray = Object.values(idObj.buffer);
    return new mongoose.Types.ObjectId(Buffer.from(bufferArray));
  }
  return idObj;
}

function fixObjectIdsDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map(fixObjectIdsDeep);
  }

  if (obj && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      if (key === "_id") {
        newObj[key] = fixId(obj[key]);
      } else {
        newObj[key] = fixObjectIdsDeep(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

function fixObjectIdsInArray(docsArray) {
  return docsArray.map(fixObjectIdsDeep);
}

/**
 * Function to process caches
 * @param {*} rawCacheHit 
 * @param {*} chapterIds 
 * @param {*} chapterNames 
 * @param {*} unitLevel 
 * @param {*} objectives 
 * @returns process and formated caches
 */
function processCacheHits(
  rawCacheHit,
  chapterIds,
  chapterNames,
  unitLevel,
  objectives
) {
  const result = [];

  const cache = Array.isArray(rawCacheHit) ? rawCacheHit : [];

  for (let i = 0; i < chapterIds.length; i++) {
    const chapterId = chapterIds[i];
    const chapterName = chapterNames[i];

    const match = cache.find(
      (item) => item.chapterId === chapterId && item.unitName === chapterName
    );

    if (match) {
      const updatedEntry = JSON.parse(JSON.stringify(match));

      updatedEntry.questionsByObjective =
        updatedEntry.questionsByObjective || {};

      objectives.forEach((objective) => {
        if (!updatedEntry.questionsByObjective[objective]) {
          updatedEntry.questionsByObjective[objective] = [];
        }
      });

      result.push(updatedEntry);
    } else {
      const newEntry = {
        chapterId,
        unitName: chapterName,
        unitLevel,
        questionsByObjective: {},
      };

      objectives.forEach((objective) => {
        newEntry.questionsByObjective[objective] = [];
      });

      result.push(newEntry);
    }
  }

  return result;
}

function processCacheHitsForSubtopic(
  rawCacheHit,
  chapterId,
  chapterNames,
  unitLevel,
  objectives
) {
  const result = [];

  const cache = Array.isArray(rawCacheHit) ? rawCacheHit : [];

  for (let i = 0; i < chapterNames.length; i++) {
    const chapterName = chapterNames[i];

    const match = cache.find(
      (item) => item.chapterId === chapterId && item.unitName === chapterName
    );

    if (match) {
      const updatedEntry = JSON.parse(JSON.stringify(match));

      updatedEntry.questionsByObjective =
        updatedEntry.questionsByObjective || {};

      objectives.forEach((objective) => {
        if (!updatedEntry.questionsByObjective[objective]) {
          updatedEntry.questionsByObjective[objective] = [];
        }
      });

      result.push(updatedEntry);
    } else {
      const newEntry = {
        chapterId,
        unitName: chapterName,
        unitLevel,
        questionsByObjective: {},
      };

      objectives.forEach((objective) => {
        newEntry.questionsByObjective[objective] = [];
      });

      result.push(newEntry);
    }
  }

  return result;
}

const QuestionType = {
  MCQ: "Four alternatives are given for each of the following questions, choose the correct alternative",
  FILL_BLANKS: "Fill in the blanks with suitable words",
  ANSWER_WORD: "Answer the following in a word, phrase or sentence",
  ANSWER_SHORT: "Answer the following in two or three sentences each",
  ANSWER_GENERAL: "Answer the following questions",
  ANSWER_LONG: "Answer the following question in four or five sentences",
  MATCH_LIST: "Match the following",
};

class Question {
  constructor(question, marks, type) {
    this.question = question;
    this.marks = marks;
    this.type = type;
  }
}

class TextQuestion {
  constructor(question = "") {
    this.question = question;
  }

  getQuestion() {
    return this.question;
  }
}

class FourOptionsQuestion {
  constructor(question = "", options = [], answer = "") {
    this.question = question;
    this.options = options;
    this.answer = answer;
  }

  getQuestion() {
    return this.question;
  }
}

class MatchingListQuestion {
  constructor(columnOneValues = [], columnTwoValues = []) {
    this.columnOneValues = columnOneValues;
    this.columnTwoValues = columnTwoValues;
  }
}

class QuestionBankCacheDoc {
  constructor(
    chapterId,
    unitName,
    unitLevel,
    questionsByObjective,
    version = "v1",
    createdAt = new Date().toISOString()
  ) {
    this.chapterId = chapterId;
    this.unitName = unitName;
    this.unitLevel = unitLevel;
    this.questionsByObjective = questionsByObjective;
    this.version = version;
    this.createdAt = createdAt;
  }
}

class QuestionTypeResponse {
  constructor(type, marks_per_question) {
    this.type = type;
    this.marks_per_question = marks_per_question;
    this.number_of_questions = 0;
    this.questions = [];
  }

  modelDump() {
    return {
      type: this.type,
      marks_per_question: this.marks_per_question,
      number_of_questions: this.number_of_questions,
      questions: this.questions,
    };
  }
}

class QuestionDistribution {
  constructor(unitName, objective) {
    this.unitName = unitName;
    this.objective = objective;
  }
}

class Template {
  constructor(
    type,
    number_of_questions,
    marks_per_question,
    question_distribution = []
  ) {
    this.type = type;
    this.number_of_questions = number_of_questions;
    this.marks_per_question = marks_per_question;
    this.question_distribution = question_distribution;
  }
}

class Chapter {
  constructor(title, indexPath, learningOutcomes, subtopics = []) {
    this.title = title;
    this.indexPath = indexPath;
    this.learningOutcomes = learningOutcomes;
    this.subtopics = subtopics;
  }
}

class QuestionBankPartsGenerationRequest {
  constructor(
    userId,
    board,
    medium,
    grade,
    subject,
    chapters,
    totalMarks,
    template,
    existingQuestions = []
  ) {
    this.userId = userId;
    this.board = board;
    this.medium = medium;
    this.grade = grade;
    this.subject = subject;
    this.chapters = chapters;
    this.totalMarks = totalMarks;
    this.template = template;
    this.existingQuestions = existingQuestions;
  }
}

module.exports = {
  cosineSimilarity,
  findMostSimilar,
  generateHash,
  preprocess,
  QuestionType,
  Question,
  TextQuestion,
  FourOptionsQuestion,
  MatchingListQuestion,
  QuestionBankCacheDoc,
  QuestionTypeResponse,
  QuestionDistribution,
  Template,
  Chapter,
  QuestionBankPartsGenerationRequest,
  getQuestions,
  filterTemplate,
  mergeQuestions,
  createQuestionObj,
  fixObjectIdsInArray,
  processCacheHits,
  processCacheHitsForSubtopic
};

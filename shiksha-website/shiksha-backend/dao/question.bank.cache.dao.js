const QuestionBankCache = require("../models/question.bank.cache.model");
const QuestionBankEmbedding = require("../models/question.bank.embedding.model");
const BaseDao = require("./base.dao");

class QuestionBankCacheDao extends BaseDao {
  constructor() {
    super(QuestionBankCache);
  }

  async uploadCache(data) {
    try {
      const result = await QuestionBankCache.insertMany(data);
      return result;
    } catch (err) {
      console.log("Error --> questionBankCacheDao -> uploadCache()", err);
      throw err;
    }
  }

  async uploadEmbedding(data) {
    try {
      const result = await QuestionBankEmbedding.insertMany(data);
      return result;
    } catch (err) {
      console.log("Error --> questionBankCacheDao -> uploadEmbedding()", err);
      throw err;
    }
  }

  async findInCache(chapterIds, unitLevel, unitNames) {
    try {
      const result = await QuestionBankCache.find({
        $and: [
          {
            chapterId: { $in: chapterIds },
          },
          {
            unitLevel: unitLevel,
          },
          {
            unitName: { $in:unitNames},
          }
        ],
      });
      return result;
    } catch (err) {
      console.log("Error --> questionBankCacheDao -> findInCache()", err);
      throw err;
    }
  }

  async updateCache(newCache) {
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
            console.log("created new doc", doc);

            const newDoc = new QuestionBankCache(doc);
            return await newDoc.save();
          }
        })
      );

      return result;
    } catch (err) {
      console.log("Error --> questionBankCacheDao -> findInCache()", err);
      throw err;
    }
  }

  async getEmbeddings(embeddingIds) {
    try {
      const result = await QuestionBankEmbedding.find({
        _id: { $in: embeddingIds },
      });
      return result;
    } catch (err) {
      console.log("Error --> questionBankCacheDao -> getEmbeddings()", err);
      throw err;
    }
  }

  async createEmbeddings(data, session = null) {
    try {
      let model = new QuestionBankEmbedding(data);
      let result = await model.save(session ? { session } : {});
      return result;
    } catch (err) {
      console.log("Error -> QuestionBankCacheDao -> createEmbeddings", err);
      throw err;
    }
  }

  async createBulkEmbeddings(data) {
    try {
      let result = await QuestionBankEmbedding.insertMany(data);
      return result;
    } catch (err) {
      console.log(
        "Error -> QuestionBankEmbedding -> createBulkEmbeddings",
        err
      );
      throw err;
    }
  }
}

module.exports = QuestionBankCacheDao;

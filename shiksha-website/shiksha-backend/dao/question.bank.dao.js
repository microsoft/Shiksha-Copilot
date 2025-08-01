const QuestionBankConfiguration = require("../models/question.bank.config.model");
const QuestionBank = require("../models/question.bank.model");
const BaseDao = require("./base.dao");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

class QuestionBankDao extends BaseDao {
  constructor() {
    super(QuestionBankConfiguration);
  }

  async getTeacherQuestionPapers(
    teacherId,
    page = 1,
    limit,
    filters = {},
    sort = {}
  ) {
    try {
      let processedFilters = { ...filters };

      for (const key in filters) {
        if (key === "grade") {
          processedFilters[key] = Number(filters[key]);
        } else if (key === "semester") {
          processedFilters[key] = JSON.parse(filters[key]);
        } else {
          processedFilters[key] = filters[key];
        }
      }

      const pipeline = [
        {
          $match: {
            teacherId: new ObjectId(teacherId),
          },
        },
        { $match: processedFilters },
        { $sort: sort },
      ];

      if (limit > 0) {
        pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
      }

      const results = await QuestionBankConfiguration.aggregate(pipeline);

      const totalItems = await QuestionBankConfiguration.countDocuments(
        processedFilters
      );

      return {
        page,
        totalItems,
        limit: limit > 0 ? limit : totalItems,
        results,
      };
    } catch (err) {
      console.log("Error --> questionBankDao -> getAll()", err);
      throw err;
    }
  }

  async saveQuestionBank(data) {
    try {
      let questionBankmodel = new QuestionBank(data); 
      const questionBank = await questionBankmodel.save()
      return questionBank;
    } catch (err) {
      throw new Error("Error creating question bank: " + err.message);
    }
  }

  async getById(id) {
    try {
      let result = await QuestionBankConfiguration.findOne({
        _id: id,
      }).populate("questionBank");
      return result;
    } catch (err) {
      console.log("Error --> QuestionBankDao -> getById()", err);
      throw err;
    }
  }

  async update(id, data) {
    try {
      const result = await QuestionBank.findOneAndUpdate(
        {
          _id: id,
        },
        {
          $set: {
            feedback: data,
          },
        },
        { new: true }
      );
      return result;
    } catch (err) {
      console.log("Error -> QuestionBankDao -> update", err);
      throw err;
    }
  }
}

module.exports = QuestionBankDao;

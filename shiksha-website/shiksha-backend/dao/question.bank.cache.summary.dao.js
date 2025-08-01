const QuestionBankCacheSummary = require("../models/question.bank.cache.summary.model");
const BaseDao = require("./base.dao");

class QuestionBankCacheSummaryDao extends BaseDao {
  constructor() {
    super(QuestionBankCacheSummary);
  }
}

module.exports = QuestionBankCacheSummaryDao;

const BaseController = require("./base.controller");
const QuestionBankCacheManager = require("../managers/question.bank.cache.manager");
const { convertToCamelCase } = require("../helper/formatter");
const handleError = require("../helper/handleError");

class QuestionBankCacheController extends BaseController {
  constructor() {
    super(new QuestionBankCacheManager());
    this.questionBankCacheManager = new QuestionBankCacheManager();
  }

  async uploadCache(req, res) {
    try {
      const processedData = convertToCamelCase(req.body);
      const result = await this.questionBankCacheManager.uploadCache(
        processedData
      );
      if (result.success) {
        return res.status(200).json(result);
      }

      handleError(result, res);
    } catch (err) {
      console.log("Error --> QuestionBankCacheControler -> uploadCache()", err);
      return res.status(400).json(err);
    }
  }

  async uploadEmbeddings(req, res) {
    try {
      const result = await this.questionBankCacheManager.uploadEmbeddings(
        req.body
      );
      if (result.success) {
        return res.status(200).json(result);
      }

      handleError(result, res);
    } catch (err) {
      console.log(
        "Error --> QuestionBankCacheControler -> uploadEmbeddings()",
        err
      );
      return res.status(400).json(err);
    }
  }
}

module.exports = QuestionBankCacheController;

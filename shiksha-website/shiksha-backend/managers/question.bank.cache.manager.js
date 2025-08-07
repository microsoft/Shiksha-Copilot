const QuestionBankCacheDao = require("../dao/question.bank.cache.dao");
const formatApiReponse = require("../helper/response");
const BaseManager = require("./base.manager");

class QuestionBankCacheManager extends BaseManager {
  constructor() {
    super(new QuestionBankCacheDao());
    this.questionBankCacheDao = new QuestionBankCacheDao();
  }

  async uploadCache(data) {
    try {
      const resp = this.questionBankCacheDao.uploadCache(data);
      return formatApiReponse(true, "Question bank cache uploaded", resp);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async uploadEmbeddings(data) {
    try {
      let embeddingsArray = [];
      for (const id in data) {
        if (data.hasOwnProperty(id)) {
          const item = data[id];

          const embeddingDoc = {
            _id: id,
            text: item.text,
            embeddings: item.embeddings,
          };

          embeddingsArray.push(embeddingDoc);
        }
      }

      const resp = this.questionBankCacheDao.uploadEmbedding(embeddingsArray);
      return formatApiReponse(true, "Question bank embedding uploaded", resp);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }
}

module.exports = QuestionBankCacheManager;

const express = require("express");
const asyncMiddleware = require("../middlewares/asyncMiddleware");
const router = express.Router();
const QuestionBankCacheController = require("../controllers/question.bank.cache.controller");
const questionBankCacheController = new QuestionBankCacheController();
const MulterUploadMiddleware = require('../middlewares/multerUploadMiddleware');
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
router.post(
  "/question-bank-cache/upload-cache",
  isAuthenticated,
  isAdmin,
  MulterUploadMiddleware,
  asyncMiddleware(
    questionBankCacheController.uploadCache.bind(questionBankCacheController)
  )
);

router.post(
  "/question-bank-cache/upload-embeddings",
  isAuthenticated,
  isAdmin,
  MulterUploadMiddleware,
  asyncMiddleware(
    questionBankCacheController.uploadEmbeddings.bind(questionBankCacheController)
  )
);
module.exports = router;

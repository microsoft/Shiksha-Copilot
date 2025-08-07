const express = require("express");
const router = express.Router();
const QuestionBankController = require("../controllers/question.bank.controller");
const asyncMiddleware = require("../middlewares/asyncMiddleware");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const { validateQuestionBankCreate, validateQuestionBankFeedbackCreate, validateQuestionBankTemplateCreate, validateQuestionBankBluePrintCreate } = require("../validations/question.bank.validation");
const questionBankController = new QuestionBankController();

router.post(
  "/question-bank/generate-template",
  isAuthenticated,
  validateQuestionBankTemplateCreate,
  asyncMiddleware(
    questionBankController.generateQuestionBankTemplate.bind(questionBankController)
  )
);

router.post(
  "/question-bank/generate-blue-print",
  isAuthenticated,
  validateQuestionBankBluePrintCreate,
  asyncMiddleware(
    questionBankController.generateQuestionBankBluePrint.bind(questionBankController)
  )
);

router.post(
  "/question-bank/generate",
  isAuthenticated,
  validateQuestionBankCreate,
  asyncMiddleware(
    questionBankController.generateQuestionBank.bind(questionBankController)
  )
);


router.get(
  "/question-bank/list",
  isAuthenticated,
  asyncMiddleware(
    questionBankController.getTeacherQuestionPapers.bind(questionBankController)
  )
);

router.get(
  "/question-bank/:id",
  asyncMiddleware(questionBankController.getById.bind(questionBankController))
);

router.patch(
  "/question-bank/feedback/:id",
  validateQuestionBankFeedbackCreate,
  asyncMiddleware(
    questionBankController.updateFeedback.bind(questionBankController)
  )
);

router.post("/question-bank/retry-failed-jobs",
  isAuthenticated,
	isAdmin,
  asyncMiddleware(
  questionBankController.retryFailedJobs.bind(questionBankController)
))

router.post("/question-bank/retry-failed-job/:id",
  isAuthenticated,
	isAdmin,
  asyncMiddleware(
  questionBankController.retryFailedJob.bind(questionBankController)
))

module.exports = router;

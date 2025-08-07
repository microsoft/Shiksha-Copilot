const QuestionBankManager = require("../managers/question.bank.manager");
const BaseController = require("./base.controller");

class QuestionBankController extends BaseController {
  constructor() {
    super(new QuestionBankManager());
    this.questionBankManager = new QuestionBankManager();
  }

  async getTeacherQuestionPapers(req, res) {
    try {
      const {
        page = 1,
        limit = 999,
        filter = {},
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
      } = req.query;
      const sortOrderObject =
        sortOrder === "desc" ? { [sortBy]: -1 } : { [sortBy]: 1 };

      const { _id: teacherId } = req.user;

      const searchFilter = {};

      if (search) {
        const searchFields = ["subject", "examinationName"];

        const regexExpressions = searchFields.map((field) => ({
          [field]: { $regex: new RegExp(search, "i") },
        }));

        if (!isNaN(parseInt(search))) {
          regexExpressions.push({ schoolId: parseInt(search) });
        }

        searchFilter.$or = regexExpressions;
      }

      const transformedFilter = { ...filter };
      if (transformedFilter._id) {
        try {
          transformedFilter._id = new ObjectId(transformedFilter._id);
        } catch (err) {
          console.error("Invalid _id format:", transformedFilter._id);
          return res.status(400).json({ error: "Invalid _id format" });
        }
      }
      const mergedFilter = { ...transformedFilter, ...searchFilter };

      const result = await this.questionBankManager.getTeacherQuestionPapers(
        teacherId,
        parseInt(page),
        parseInt(limit),
        mergedFilter,
        sortOrderObject
      );

      if (result.success) {
        return res.status(200).json(result);
      }

      handleError(result, res);

      return;
    } catch (err) {
      console.log("Error --> BaseController -> getAll()", err);
      return res.status(400).json(err);
    }
  }

  async generateQuestionBankTemplate(req, res) {
    try {
      const user = req.user;
      const result = await this.questionBankManager.generateQuestionBankTemplate(
        req,
        user
      );
      return res.status(200).json(result);
    } catch (err) {
      console.log(
        "Error --> QuestionBankController -> generateQuestionBank()",
        err
      );
      return res.status(400).json(err);
    }
  }

  async generateQuestionBankBluePrint(req, res) {
    try {
      const user = req.user;
      const result = await this.questionBankManager.generateQuestionBankBluePrint(
        req,
        user
      );
      return res.status(200).json(result);
    } catch (err) {
      console.log(
        "Error --> QuestionBankController -> generateQuestionBankBluePrint()",
        err
      );
      return res.status(400).json(err);
    }
  }

  async generateQuestionBank(req, res) {
    try {
      const user = req.user;
      const result = await this.questionBankManager.generateQuestionBank(
        req,
        user
      );
      return res.status(200).json(result);
    } catch (err) {
      console.log(
        "Error --> QuestionBankController -> generateQuestionBank()",
        err
      );
      return res.status(400).json(err);
    }
  }

  async updateFeedback(req, res) {
    try {
      const questionBankId = req.params.id;
      const feedback = req.body;
      const result = await this.questionBankManager.updateFeedback(
        questionBankId,
        feedback
      );
      return res.status(200).json(result);
    } catch (err) {
      console.log("Error --> QuestionBankController -> updateFeedback()", err);
      return res.status(400).json(err);
    }
  }

  async retryFailedJobs(req, res) {
    try {
      const result = await this.questionBankManager.retryFailedJobs();
      return res.status(200).json(result);
    } catch (err) {
      console.log("Error --> QuestionBankController -> retryFailedJobs()", err);
      return res.status(400).json(err);
    }
  }

  async retryFailedJob(req, res) {
    try {
      const jobId = req.params.id;
      const result = await this.questionBankManager.retryFailedJob(jobId);
      return res.status(200).json(result);
    } catch (err) {
      console.log("Error --> QuestionBankController -> retryFailedJobs()", err);
      return res.status(400).json(err);
    }
  }
}

module.exports = QuestionBankController;

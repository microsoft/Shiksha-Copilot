const baselineSurveyManager = require('../managers/baselineSurvey.manager');
const formatResponse = require('../helper/response'); // neutral alias

class BaselineSurveyController {
  // GET /api/baseline-surveys/check
  async checkIfCompleted(req, res) {
    try {
      const userId = req.user?._id;
      if (!userId) return res.status(401).json(formatResponse(false, 'Unauthorized', null));

      const result = await baselineSurveyManager.checkCompleted(userId);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('BaselineSurveyController.checkIfCompleted', err);
      return res.status(500).json(formatResponse(false, 'Server error', null));
    }
  }

  // POST /api/baseline-surveys
  async submitSurvey(req, res) {
    try {
      const userId = req.user?._id;
      if (!userId) return res.status(401).json(formatResponse(false, 'Unauthorized', null));

      const result = await baselineSurveyManager.submitSurvey(userId, req.body);
      const status = result.success ? 200 : (result.message === 'Already submitted' ? 409 : 400);
      return res.status(status).json(result);
    } catch (err) {
      console.error('BaselineSurveyController.submitSurvey', err);
      if (err?.code === 11000) {
        return res.status(409).json(formatResponse(false, 'Already submitted', null));
      }
      return res.status(500).json(formatResponse(false, 'Server error', null));
    }
  }
}

module.exports = new BaselineSurveyController();

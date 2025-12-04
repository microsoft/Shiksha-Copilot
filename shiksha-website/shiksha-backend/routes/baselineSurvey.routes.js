const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/asyncMiddleware');
const { isAuthenticated } = require('../middlewares/auth');
const baselineController = require('../controllers/baselineSurvey.controller');

router.get(
  '/baseline-surveys/check',
  isAuthenticated,
  asyncMiddleware(baselineController.checkIfCompleted.bind(baselineController))
);

router.post(
  '/baseline-surveys',
  isAuthenticated,
  asyncMiddleware(baselineController.submitSurvey.bind(baselineController))
);

module.exports = router;

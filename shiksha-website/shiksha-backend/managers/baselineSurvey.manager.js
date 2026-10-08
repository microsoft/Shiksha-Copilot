

const BaseManager = require('./base.manager');
const formatApiResponse = require('../helper/response');
const BaselineSurveyDao = require('../dao/baselineSurvey.dao');

class BaselineSurveyManager extends BaseManager {
  constructor() {
    const dao = new BaselineSurveyDao();
    super(dao);
    this.dao = dao;
  }

  async checkCompleted(userId) {
    try {
      if (!userId) return formatApiResponse(false, 'Missing userId', null);
      const exists = await this.dao.existsByUser(userId);
      return formatApiResponse(true, 'OK', { completed: !!exists });
    } catch (err) {
      console.error('BaselineSurveyManager.checkCompleted', err);
      return formatApiResponse(false, 'Server error', null);
    }
  }

  async submitSurvey(userId, body, session = null) {
    try {
      if (!userId) return formatApiResponse(false, 'Missing userId', null);

      const already = await this.dao.findByUser(userId);
      if (already) return formatApiResponse(false, 'Already submitted', null);

      // ---- NORMALIZE ARRAYS ----
      const plans = Array.isArray(body.plans) ? body.plans : [];
      const devices = Array.isArray(body.devices) ? body.devices : [];
      let lessonPlanComponents = Array.isArray(body.lessonPlanComponents)
        ? body.lessonPlanComponents
        : [];
      let resourcesUsed = Array.isArray(body.resourcesUsed) ? body.resourcesUsed : [];

      const otherLessonPlanComponent = (body.otherLessonPlanComponent || '').trim();
      const otherResourceUsed = (body.otherResourceUsed || '').trim();

      // If user typed "Others" for components, store it as "Others: <text>"
      if (otherLessonPlanComponent) {
        // remove bare "Others" from array if present
        lessonPlanComponents = lessonPlanComponents.filter(v => v !== 'Others');
        lessonPlanComponents.push(`Others: ${otherLessonPlanComponent}`);
      }

      // If user typed "Others" for resources, store it as "Others: <text>"
      if (otherResourceUsed) {
        resourcesUsed = resourcesUsed.filter(v => v !== 'Others');
        resourcesUsed.push(`Others: ${otherResourceUsed}`);
      }

      // ---- NORMALIZE TIME FIELDS ----
      let timePerLessonPlan = body.timePerLessonPlan || '';
      let timeForAssessments = body.timeForAssessments || '';

      const otherTimePerLessonPlan = (body.otherTimePerLessonPlan || '').trim();
      const otherTimeForAssessments = (body.otherTimeForAssessments || '').trim();

      // If dropdown value is "Others" and text is given, replace it with the text
      if (timePerLessonPlan === 'Others' && otherTimePerLessonPlan) {
        timePerLessonPlan = otherTimePerLessonPlan;
      }

      if (timeForAssessments === 'Others' && otherTimeForAssessments) {
        timeForAssessments = otherTimeForAssessments;
      }

      const payload = {
        userId,
        plans,
        devices,
        weeklyLessonPlans: body.weeklyLessonPlans || '',
        lessonPlanComponents,
        timePerLessonPlan,
        resourcesUsed,
        timeForAssessments,
        otherNotes: body.otherNotes || '',
      };

      const doc = await this.dao.createSurvey(payload, session);
      return formatApiResponse(true, 'Survey submitted', doc);
    } catch (err) {
      console.error('BaselineSurveyManager.submitSurvey', err);
      if (err && err.code === 11000) {
        return formatApiResponse(false, 'Already submitted', null);
      }
      return formatApiResponse(false, 'Server error', null);
    }
  }
}

module.exports = new BaselineSurveyManager();

const LessonPlanTemplate = require("../models/lesson.plan.template.model.js");
const BaseDao = require("./base.dao.js");
class LessonPlanTemplateDao extends BaseDao {
  constructor() {
    super(LessonPlanTemplate);
  }
}

module.exports = LessonPlanTemplateDao;

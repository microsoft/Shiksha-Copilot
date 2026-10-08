const LessonPlanTemplateDao = require("../dao/lesson.plan.template.dao");
const formatApiReponse = require("../helper/response");
const BaseManager = require("./base.manager");
class LessonPlanTemplateManager extends BaseManager {
  constructor() {
    super(new LessonPlanTemplateDao());
    this.lessonPlanTemplateDao = new LessonPlanTemplateDao();
  }

  async findAllTemplates(filter) {
    try {
      const templates = await this.lessonPlanTemplateDao.filter(filter);
      if (!templates) {
        return formatApiReponse(false, "Templates not found", null);
      }
      return formatApiReponse(true, "", templates);
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }
}

module.exports = LessonPlanTemplateManager;

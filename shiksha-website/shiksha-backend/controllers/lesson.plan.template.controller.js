const handleError = require("../helper/handleError");
const LessonPlanTemplateManager = require("../managers/lesson.plan.template.manager");
const BaseController = require("./base.controller");

class LessonPlanTemplateController extends BaseController {
  constructor() {
    super(new LessonPlanTemplateManager());
    this.lessonPlanTemplateManager = new LessonPlanTemplateManager();
  }

  async findTemplates(req, res) {
    try {
      let { filter = {} } = req.query;

      filter.classes = parseInt(filter.classes);

      const result = await this.lessonPlanTemplateManager.findAllTemplates(
        filter
      );

      if (result.success) {
        return res.status(200).json(result);
      }

      handleError(result, res);

      return;
    } catch (err) {
      console.log(
        "Error --> LessonPlanTemplateController -> findTemplates()",
        err
      );
      return res.status(400).json(err);
    }
  }
}

module.exports = LessonPlanTemplateController;

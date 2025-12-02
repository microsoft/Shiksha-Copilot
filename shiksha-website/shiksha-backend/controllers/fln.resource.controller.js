const BaseController = require('./base.controller');
const FLNResourceManager = require('../managers/fln.resource.manager');
const handleError = require('../helper/handleError');

class FLNResourceController extends BaseController {
  constructor() {
    super(new FLNResourceManager());
    this.flnResourceManager = new FLNResourceManager();
    this.uploadFLNFile = this.uploadFLNFile.bind(this);
    this.getGrades = this.getGrades.bind(this);
    this.getDaysByGrade = this.getDaysByGrade.bind(this);
    this.getLesson = this.getLesson.bind(this);
    this.exportLessonsExcel = this.exportLessonsExcel.bind(this);
  }

  async uploadFLNFile(req, res) {
    const result = await this.flnResourceManager.uploadFLNFile(req);
    if (result.success) {
      return res.json(result.data);
    }
    handleError(result, res);
  }

  async getGrades(req, res) {
    const result = await this.flnResourceManager.getGrades();
    if (result.success) {
      return res.json(result.data);
    }
    handleError(result, res);
  }

  async getDaysByGrade(req, res) {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: 'grade required' });
    const result = await this.flnResourceManager.getDaysByGrade(grade);
    if (result.success) {
      return res.json(result.data);
    }
    handleError(result, res);
  }

  async getLesson(req, res) {
    const { grade, day } = req.query;
    if (!grade || !day) return res.status(400).json({ error: 'grade and day required' });
    const result = await this.flnResourceManager.getLesson(grade, day);
    if (result.success) {
      return res.json(result.data);
    }
    handleError(result, res);
  }

  async exportLessonsExcel(req, res) {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: 'grade required' });
    const result = await this.flnResourceManager.exportLessonsExcel(grade, res);
    if (result && !result.success) {
      handleError(result, res);
    }
  }
}

module.exports = new FLNResourceController();

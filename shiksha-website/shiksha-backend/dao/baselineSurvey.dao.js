const BaseDao = require('./base.dao');
const BaselineSurvey = require("../models/baselineSurvey.model");


class BaselineSurveyDao extends BaseDao {
  constructor() {
    super(BaselineSurvey);
    this.model = BaselineSurvey;
  }

  async existsByUser(userId, year = new Date().getFullYear()) {
    const exists = await this.model.exists({ userId, year });
    return !!exists;
  }

  async findByUser(userId, year = new Date().getFullYear()) {
    return this.model.findOne({ userId, year }).lean();
  }

  async createSurvey(payload, session = null) {
    // use create to allow unique index to throw E11000 for dup userId
    const withYear = {
      year: new Date().getFullYear(),
      ...payload,
    };
    return this.model.create([withYear], { session }).then(([doc]) => doc);
  }
}

module.exports = BaselineSurveyDao;

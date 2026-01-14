const BaseDao = require('./base.dao');
const TeacherTrainingBatch = require('../models/teacher.training.batch.model');

class TeacherTrainingBatchDao extends BaseDao {
  constructor() {
    super(TeacherTrainingBatch);
  }
  // Add any batch-specific DAO methods here if needed
}

module.exports = TeacherTrainingBatchDao; 
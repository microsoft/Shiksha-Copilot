const BaseManager = require('./base.manager');
const TeacherTrainingBatchDao = require('../dao/teacher.training.batch.dao');
const User = require('../models/user.model');
const TeacherTrainingBatch = require('../models/teacher.training.batch.model');
const formatApiReponse = require('../helper/response');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
// const ejs = require('ejs');
const path = require('path');

class TeacherTrainingBatchManager extends BaseManager {
  constructor() {
    super(new TeacherTrainingBatchDao());
    this.batchDao = new TeacherTrainingBatchDao();
  }

  // Example: getBatches logic
  async getBatches(user) {
    try {
      let query = {};
      if (user && user.role && user.role.includes('manager') && !user.role.includes('admin')) {
        query.createdBy = user._id;
      }
      const batches = await TeacherTrainingBatch.find(query).populate('assignedTeachers', 'name zone district phone');
      return formatApiReponse(true, '', batches);
    } catch (err) {
      return formatApiReponse(false, err.message, null);
    }
  }

  // Add other business logic methods here, moving from the old controller
}

module.exports = TeacherTrainingBatchManager; 
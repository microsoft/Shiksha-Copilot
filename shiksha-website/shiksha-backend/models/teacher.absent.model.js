const mongoose = require('mongoose');

const teacherAbsentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherTrainingBatch',
    required: true
  },
  batchName: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  teacherPhone: {
    type: String,
    required: true
  },
  teacherZone: {
    type: String,
    required: true
  },
  teacherDistrict: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TeacherAbsent = mongoose.model('TeacherAbsent', teacherAbsentSchema);

module.exports = TeacherAbsent; 
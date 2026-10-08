const mongoose = require('mongoose');

const teacherTrainingBatchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  scheduleDate: {
    type: Date,
    required: true
  },
  trainingType: {
    type: String,
    enum: ['offline', 'online', 'School-Level'],
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true
  },
  assignedTeachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  attendance: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  isSubmitted: {
    type: Boolean,
    default: false
  },
  permissionLetterPdfPath: {
    type: String,
    required: false
  },
  permissionLetterPdfExpiresIn: {
      type: Number,
      default: parseInt(Date.now() / 1000),
  },
  attendancePdfPath: {
    type: String,
    required: false
  },
  attendancePdfExpiresIn: {
      type: Number,
      default: parseInt(Date.now() / 1000),
    },
  photoPaths: [
    {
      path: {
        type: String,
        required: false
      },
      mimetype: {
        type: String,
        required: false
      },
      expiresIn: {
      type: Number,
      default: parseInt(Date.now() / 1000),
    }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

teacherTrainingBatchSchema.pre('save', function(next) {
  this.updatedAt = Date.now(); 
  next();
});

const TeacherTrainingBatch = mongoose.model('TeacherTrainingBatch', teacherTrainingBatchSchema);

module.exports = TeacherTrainingBatch; 
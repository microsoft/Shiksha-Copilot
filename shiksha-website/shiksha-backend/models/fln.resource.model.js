const mongoose = require('mongoose');

const FLNResourceSchema = new mongoose.Schema({
  grade: { type: String, required: true }, // added grade field
  originalFileName: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  data: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('FLNResource', FLNResourceSchema);

const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true
    },
    sem: {
      type: Number,
      required: true,
    },
    boards: [
      {
        type: String,
        required: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const MasterSubject = mongoose.model("MasterSubject", subjectSchema);

module.exports = MasterSubject;

const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const applicableClassesSchema = new mongoose.Schema(
  {
        board: { type: String },
        classes: [{ type: Number }]
      }
) 

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
    applicableClasses:[
      {
        type:applicableClassesSchema,
        default:[]
      }
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

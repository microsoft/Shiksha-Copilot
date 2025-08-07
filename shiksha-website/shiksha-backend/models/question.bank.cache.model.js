const mongoose = require("mongoose");
const { Schema } = mongoose;

const questionSchema = new Schema({
  question: {
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      default: undefined,
    },
    answer: {
      type: String,
      default: undefined,
    },
  },
  marks: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
});

const objectiveSchema = new Schema(
  {
    knowledge: {
      type: [questionSchema],
      default: undefined,
    },
    understanding: {
      type: [questionSchema],
      default: undefined,
    },
    application: {
      type: [questionSchema],
      default: undefined,
    },
    skill: {
      type: [questionSchema],
      default: undefined,
    },
    comprehension: {
      type: [questionSchema],
      default: undefined,
    },
    expression: {
      type: [questionSchema],
      default: undefined,
    },
    appreciation: {
      type: [questionSchema],
      default: undefined,
    },
  },
  { _id: false }
);

const questionBankCacheSchema = new Schema(
  {
    chapterId: { type: String, required: true, index: true },
    unitName: { type: String, required: true, index: true },
    unitLevel: { type: String, required: true, index: true },
    questionsByObjective: objectiveSchema,
    version: { type: String },
  },
  { timestamps: true }
);

const QuestionBankCache = mongoose.model(
  "QuestionBankCache",
  questionBankCacheSchema
);

module.exports = QuestionBankCache;

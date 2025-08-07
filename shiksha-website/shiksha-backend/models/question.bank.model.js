const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const _ = require('lodash');

const questionsSchema = new Schema({
  type:{
    type:String,
    required: true
  },
  numberOfQuestions:{
    type:Number,
    required: true
  },
  marksPerQuestion:{
    type:Number,
    required: true
  },
  questions:[{ type: Schema.Types.Mixed }]
});

const questionBankSchema = new Schema({
  metadata: {
    schoolName: {
      type: String
    },
    docxUrl: {
      type: String
    }
  },
  questions:[questionsSchema],
  feedback: {
    question: {
      type: String,
    },
    feedback: {
      type: String,
    },
    overallFeedback: {
      type: String,
    },
  },
},
{ timestamps: true }
);

const QuestionBank = mongoose.model("QuestionBank", questionBankSchema);

module.exports = QuestionBank;

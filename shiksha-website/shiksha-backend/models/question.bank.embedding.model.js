const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const questionBankEmbeddingSchema = new Schema(
  {
    _id: { type: String, required: true },
    text: { type: String, required: true },
    embeddings: { type: [Number], required: true },
  },
  {
    timestamps: true,
  }
);

const QuestionBankEmbedding = mongoose.model(
  "QuestionBankEmbedding",
  questionBankEmbeddingSchema
);

module.exports = QuestionBankEmbedding;

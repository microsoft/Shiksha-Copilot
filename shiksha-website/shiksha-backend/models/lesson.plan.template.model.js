const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const templateSectionSchema = new Schema({
  id: { type: String },
  title: { type: String },
  mode: { type: String },
  description: { type: String },
  outputFormat: { type: String },
  textbookContent: { type: Boolean },
  dependencies: [{ type: Object }],
});

const lessonPlanTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    workFlowId: { type: String, required: true },
    model: { type: String, required: true },
    description: { type: String },
    boards: [{ type: String }],
    mediums: [{ type: String }],
    classes: [{ type: Number }],
    subjects: [{ type: String }],
    type: { type: String },
    sections: [templateSectionSchema],
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["created", "under_review", "approved"],
      default: "created",
    },
    approvedBy: {
      type: ObjectId,
      ref: "AdminUser",
    },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

lessonPlanTemplateSchema.index({ boards: 1 });
lessonPlanTemplateSchema.index({ mediums: 1 });
lessonPlanTemplateSchema.index({ classes: 1 });
lessonPlanTemplateSchema.index({ subjects: 1 });

const LessonPlanTemplate = mongoose.model(
  "LessonPlanTemplate",
  lessonPlanTemplateSchema
);

module.exports = LessonPlanTemplate;

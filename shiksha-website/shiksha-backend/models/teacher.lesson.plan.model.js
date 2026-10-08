const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const MediaSchema = new mongoose.Schema({
  title: { type: String },
  type: { type: String, enum: ["image", "video"], required: true },
  link: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const SectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: mongoose.Schema.Types.Mixed, default: "" },
  outputFormat: { type: String },
  media: { type: [MediaSchema], default: [] }
});

const teacherLessonPlan = new Schema(
	{
		teacherId: {
			type: ObjectId,
			ref: "User",
			required: true,
		},
		lessonId: {
			type: ObjectId,
			ref: "MasterLesson",
		},
		resourceId: {
			type: ObjectId,
			ref: "MasterResource",
		},
		baseLessonId: {
            type: ObjectId,
            ref: "MasterLesson",
        },
		isLesson: {
			type: Boolean,
			default: true,
		},
		status: {
            type: String,
            enum: ["running","completed", "failed","pending"],
            default: "completed",
        },
        instanceId: {
            type: String,
        },
        isGenerated: {
            type: Boolean,
            default: false,
        },
		resources: {
			type: Object,
			default: [],
		},
		additionalResources: {
			type: Object,
			default: [],
		},
		learningOutcomes: {
			type: Object,
			default: [],
		},
		instructionSet: {
			type: Object,
			default: [],
		},
		isCompleted: {
			type: Boolean,
			default: false,
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		isVideoSelected :{
			type: Boolean,
			default: false,
		},
		sections: { type: [SectionSchema], default: [] },
	},
	{ timestamps: true }
);

const TeacherLessonPlan = mongoose.model(
	"TeacherLessonPlan",
	teacherLessonPlan
);

module.exports = TeacherLessonPlan;

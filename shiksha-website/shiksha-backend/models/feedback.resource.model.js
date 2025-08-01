const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const teacherResourceFeedbackSchema = new Schema(
	{
		teacherId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		resourceId: {
			type: Schema.Types.ObjectId,
			ref: "MasterResource",
		},
		resources: {
			type: Object,
			default: {},
		},
		feedbackPerSets: {
			type: Object,
		},
		feedback: {
			type: String,
		},
		overallFeedbackReason: {
			type: String,
		},
		isCompleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const TeacherResourceFeedback = mongoose.model(
	"TeacherResourceFeedback",
	teacherResourceFeedbackSchema
);

module.exports = TeacherResourceFeedback;

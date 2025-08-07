const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;


const feedbackSchema = new Schema({
	question:{
		type:String,
		default:''
	},
	feedback:{
		type:String,
		default:''
	}
})

const feedbackPersetsSchema = new Schema({
	type:{
		type:String
	},
	questions:[feedbackSchema]
})

const regenFeedbackSchema = new Schema({
	type:{
		type:String
	},
	feedback:{
		type:String
	}
})

const lesssonFeedbackSchema = new Schema(
	{
		teacherId: {
			type: ObjectId,
			require: true,
			ref: "User",
		},
		lessonId: {
			type: ObjectId,
			ref: "MasterLesson",
		},
		feedbackPerSets: [feedbackPersetsSchema],
		regenFeedback:[regenFeedbackSchema],
		assessment: [],
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

const LessonFeedback = mongoose.model("LessonFeedback", lesssonFeedbackSchema);

module.exports = LessonFeedback;

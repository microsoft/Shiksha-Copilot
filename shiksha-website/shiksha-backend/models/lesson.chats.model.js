const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ObjectId = mongoose.Types.ObjectId;

const lessonChatSchema = new Schema(
	{
		teacherId: {
			type: ObjectId,
			required: true,
			ref: "User", 
		},
		recordId: {
			type: ObjectId,
			required: true,
			ref: "TeacherLessonPlan",
		},
		message: {
			question: {
				type: String,
				required: [true, "Question is required"],
			},
			answer: {
				type: String,
				required: [true, "Answer is required"],
			},
			timestamp: {
				type: Date,
				default: Date.now,
			},
		},
	},
	{
		timestamps: true,
	}
);

const LessonChat = mongoose.model("LessonChat", lessonChatSchema);

module.exports = LessonChat;

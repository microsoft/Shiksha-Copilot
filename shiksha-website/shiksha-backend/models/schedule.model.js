require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./user.model");
const ObjectId = mongoose.Types.ObjectId;

const scheduleSchema = mongoose.Schema(
	{
		teacherId: {
			type: ObjectId,
			ref: User,
		},
		subject: {
			type: String,
		},
		schoolId: {
			type: ObjectId,
			ref: "School",
		},
		scheduleType: {
			type: String,
			enum: ["regular"],
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		class: {
			type: Number,
		},
		medium: {
			type: String,
			required: true,
		},
		board: {
			type: String,
			required: true,
		},
		section: {
			type: String,
		},
		otherClass: {
			type: String,
			default: "",
		},
		topic: {
			type: String,
			default: "",
		},
		subTopic: {
			type: String,
			default: "",
		},
		lessonId: {
			ref: "TeacherLessonPlan",
			type: ObjectId,
		},
		scheduleDateTime: [
			{
				date: {
					type: Date,
				},
				fromTime: {
					type: String,
				},
				toTime: {
					type: String,
				},
			},
		],
	},
	{ timestamps: true }
);

const Schedule = mongoose.model("Schedule", scheduleSchema);

module.exports = Schedule;

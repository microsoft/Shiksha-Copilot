const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

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
		}
	},
	{ timestamps: true }
);

const TeacherLessonPlan = mongoose.model(
	"TeacherLessonPlan",
	teacherLessonPlan
);

module.exports = TeacherLessonPlan;

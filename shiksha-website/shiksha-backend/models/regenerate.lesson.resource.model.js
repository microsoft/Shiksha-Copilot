const mongoose = require("mongoose");

const regeneratedLessonResourceSchema = new mongoose.Schema(
	{
		isLesson: {
			type: Boolean,
			required: true,
		},
		status: {
            type: String,
            enum: ["running","completed", "failed","pending"],
            default: "running",
        },
		isMasterContent: {
            type: Boolean,
            required: true,
            default: false,
        },
		isLoGeneratedContent:{
            type: Boolean,
            default: false,
		},
		recordId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "TeacherLessonPlan",
		},
		contentId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			refPath: "contentType",
		},
		genContentId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			refPath: "genContentType",
		},
		generatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			required: "User",
		},
		_version:{
			type:Number,
			default:0
		}
	},
	{
		timestamps: true,
	}
);

regeneratedLessonResourceSchema.virtual("contentType").get(function () {
	return this.isLesson ? "MasterLesson" : "MasterResource";
});

regeneratedLessonResourceSchema.virtual("genContentType").get(function () {
	return this.isLesson ? "MasterLesson" : "MasterResource";
});

const RegeneratedLessonResource = mongoose.model(
	"RegeneratedLessonResource",
	regeneratedLessonResourceSchema
);

module.exports = RegeneratedLessonResource;

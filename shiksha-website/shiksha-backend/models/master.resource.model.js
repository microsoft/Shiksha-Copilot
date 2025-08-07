const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const lessonResourceMasterSchema = new mongoose.Schema({
	lessonName: {
		type: String,
		required: true,
	},
	medium: {
		type: String,
		required: true,
	},
	lessonId: {
		type: ObjectId,
		ref: "MasterLesson",
	},
	class: {
		type: Number,
	},
	isAll: {
		type: Boolean,
	},
	board: {
		type: String,
	},
	subject: {
		type: String,
	},
	semester: {
		type: String,
		required: true,
	},
	chapterId: {
		type: ObjectId,
		ref: "Chapter",
		required: true,
	},
	subTopics: [
		{
			type: String,
		},
	],
	learningOutcomes: [{ type: Object, default: [] }],
	resources: [
		{
			type: Object,
			default: [],
		},
	],
	additionalResources: [
		{
			type: Object,
			default: [],
		},
	],
});

const MasterResource = mongoose.model(
	"MasterResource",
	lessonResourceMasterSchema
);

module.exports = MasterResource;

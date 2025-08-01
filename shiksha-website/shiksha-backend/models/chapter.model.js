const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const chapterSchema = mongoose.Schema(
	{
		subjectId: {
			type: ObjectId,
			ref: "MasterSubject",
			required: true,
		},
		topics: {
			type: String,
			required: true,
		},
		subTopics: [
			{
				type: String,
				required: true,
			},
		],
		medium: {
			type: String,
			required: true,
		},
		standard: {
			type: Number,
			required: true,
		},
		board: {
			type: String,
			required: true,
		},
		orderNumber:{
			type: Number,
			required: true,
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		indexPath:{
			type:String
		},
		learningOutcomes:[
			{
				type:String
			}
		],
		topicsLearningOutcomes:[
			{
				title:{
					type:String
				},
				learningOutcomes:[
					{type:String}
				]
			}
		]
	},
	{ timestamps: true }
);

const Chapter = mongoose.model("Chapter", chapterSchema);

module.exports = Chapter;

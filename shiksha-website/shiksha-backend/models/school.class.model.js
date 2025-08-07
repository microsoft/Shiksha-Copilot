const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const classSchema = new mongoose.Schema(
	{
		board: {
			type: String,
		},
		medium: {
			type: String,
			required: true,
		},
		start: {
			type: Number,
			required: true,
		},
		end: {
			type: Number,
			required: true,
		},
		classDetails: [
			{
				section: {
					type: String,
					default: "A",
				},
				standard: {
					type: Number,
					required: true,
				},
				girlsStrength: {
					type: Number,
					required: true,
				},
				boysStrength: {
					type: Number,
					required: true,
				},
				totalStrength: {
					type: Number,
					required: true,
				},
			},
		],
		schoolId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "School",
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const ClassModel = mongoose.model("Class", classSchema);

module.exports = ClassModel;

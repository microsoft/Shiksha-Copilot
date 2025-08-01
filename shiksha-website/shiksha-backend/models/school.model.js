const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		website: {
			type: String,
		},
		schoolId: {
			type: Number,
			required: true,
			unique: true,
		},
		type: {
			type: String,
			enum: ["rural", "urban"],
			default: "urban",
		},
		boards: [
			{
				type: String,
				required: true,
			},
		],
		state: {
			type: String,
			required: true,
		},
		zone: {
			type: String,
			required: true,
		},
		district: {
			type: String,
			required: true,
		},
		block: {
			type: String,
			required: true,
		},
		playground: {
			type: Boolean,
		},
		mediums: [
			{
				type: String,
				required: true,
			},
		],
		academicYearStartDate: {
			type: Date,
		},
		academicYearEndDate: {
			type: Date,
		},
		holidayList: [
			{
				date: {
					type: Date,
				},
				reason: {
					type: String,
				},
			},
		],
		isDeleted: {
			type: Boolean,
			default: false,
		},
		facilities: [],
	},
	{ timestamps: true }
);

const School = mongoose.model("School", schoolSchema);

module.exports = School;

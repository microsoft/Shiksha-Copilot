const mongoose = require("mongoose");

const masterClassSchema = new mongoose.Schema(
	{
		standard: {
			type: Number,
			required: true,
		},
		medium: {
			type: String,
			required: true,
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const MasterClass = mongoose.model("MasterClass", masterClassSchema);

module.exports = MasterClass;

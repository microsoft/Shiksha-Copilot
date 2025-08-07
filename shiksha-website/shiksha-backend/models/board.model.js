const mongoose = require("mongoose");

const boardSchema = mongoose.Schema(
	{
		boardName: {
			type: String,
			required: true,
		},
		abbrevation: {
			type: String,
		},
		state: {
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

const Board = mongoose.model("Board", boardSchema);

module.exports = Board;

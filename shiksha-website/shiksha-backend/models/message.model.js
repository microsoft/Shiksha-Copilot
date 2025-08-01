const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ObjectId = mongoose.Types.ObjectId;

const messageSchema = new Schema(
	{
		chatHistoryId: {
			type: ObjectId,
			required: true,
			ref: "Chat",
		},
		messages: [
			{
				question: {
					type: String,
					required: [true, "Question is required"],
				},
				answer: {
					type: String,
					required: [true, "Answer is required"],
				},
				createdAt: {
					type: Date,
					default: Date.now,
				},
			},
		],
	},
	{
		timestamps: true,
	}
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;

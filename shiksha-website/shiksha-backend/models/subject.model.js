const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subjectSchema = new Schema(
	{
		subject: {
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

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;

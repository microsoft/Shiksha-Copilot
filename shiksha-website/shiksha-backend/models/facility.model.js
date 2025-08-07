const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const facilitySchema = mongoose.Schema(
	{
		subject: {
			type: ObjectId,
			ref: "MasterSubject",
		},
		type: {
			type: String,
			required: true,
		},
		facilities: [
			{
				type: String,
			},
		],
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const Facility = mongoose.model("Facility", facilitySchema);

module.exports = Facility;

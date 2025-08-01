const mongoose = require("mongoose");

const regionSchema = new mongoose.Schema(
	{
		state: {
			type: String,
		},
		zones: [
			{
				name :{
					type:String,
				},
				districts: {
					name: {
						type: String,
						required: true,
						blocks: [
							{
								name: {
									type: String,
									required: true,
								},
							},
						],
					},
				},
			},
		],
	},
	{ timestamps: true }
);

const Region = mongoose.model("Region", regionSchema);

module.exports = Region;

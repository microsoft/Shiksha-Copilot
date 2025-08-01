require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const adminUserSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		phone: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
		},
		address: {
			type: String,
		},
		role: [
			{
				type: String,
				enum: ["manager", "admin"],
				required: true,
			},
		],
		isDeleted: {
			type: Boolean,
			default: false,
		},
		otp: {
			type: String,
		},
		rememberMeToken: {
			type: Boolean,
			default: false,
		},
		isLoginAllowed: {
			type: Boolean,
			default: true,
		  },
	},
	{ timestamps: true }
);

adminUserSchema.methods.generateAuthToken = function () {
	const token = jwt.sign(
		{ _id: this._id, isAdmin: true, isDeleted: this.isDeleted },
		JWT_SECRET,
		{
			expiresIn: "7d",
		}
	);
	return token;
};

const AdminUser = mongoose.model("AdminUser", adminUserSchema);

module.exports = AdminUser;

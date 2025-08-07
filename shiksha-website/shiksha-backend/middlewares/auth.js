require("dotenv").config();

const jwt = require("jsonwebtoken");

const User = require("../models/user.model.js");
const AdminUser = require("../models/admin.user.model.js");
const { JWT_SECRET } = process.env;

exports.isAuthenticated = function (req, res, next) {
	try {
		const { authorization } = req.headers;
		if (!authorization) {
			return res.status(401).json({ success: false, message: "Access Denied" });
		}
		jwt.verify(authorization, JWT_SECRET, async (err, payload) => {
			if (err) {
				return res.status(401).json({
					success: false,
					message: "Session Expired! Please login again.",
				});
			}
			const { _id, isAdmin, isDeleted } = payload;

			let user;

			if (isDeleted) {
				return res.status(401).json({
					success: false,
					message:
						"Your account is inactive! Please activate your account to continue.",
				});
			}

			if (isAdmin) {
				user = await AdminUser.findById(_id).select("-otp");
			} else {
				user = await User.findById(_id).populate("school", "name medium board").select("-otp");;
			}

			if (!user) {
				return res.status(401).json({
					success: false,
					message: "Account doesn't exist!",
				});
			}

			if(user.isDeleted)
			{
				return res.status(401).json({
					success: false,
					message: "Your account is inactive!",
				});
			}

			if (!user.isLoginAllowed) {
				const message = !user.isProfileCompleted && !isAdmin && 
				  !req.route.path.includes("/set-profile") &&
				  !req.route.path.includes("/update-language")
				  ? "You have been assigned to a different school. Please login to continue"
				  : "Account details updated by admin! Please login to continue";
				  return res.status(401).json({
					success: false,
					message
				  });
				}

			req.user = user;
			req.isAdmin = isAdmin;
			next();
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({ message: "Something went wrong" });
	}
};

exports.isAdmin = function (req, res, next) {
	try {
		if (!req.isAdmin) {
			return res.status(401).json({
				success: false,
				message: "Access Denied!",
			});
		}

		next();
	} catch (err) {
		console.log(err);
		res.status(500).json({ message: "Something went wrong" });
	}
};

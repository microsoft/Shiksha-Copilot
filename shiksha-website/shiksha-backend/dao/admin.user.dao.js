const AdminUser = require("../models/admin.user.model.js");
const BaseDao = require("./base.dao.js");

class AdminUserDao extends BaseDao {
	constructor() {
		super(AdminUser);
	}

	async getByPhone(phone) {
		try {
			let adminUser = await AdminUser.findOne({ phone });
			if (adminUser) return adminUser;
			return false;
		} catch (err) {
			console.log("Error -> AdminUserDao -> getByPhone", err);
		}
	}

	async update(id, data, session = null) {
		try {
			const result = await AdminUser.findOneAndUpdate(
				{ _id: id },
				{
					$set: {
						name: data?.name,
						email: data?.email,
						phone: data?.phone,
						address: data?.address,
						role: data?.role,
						isDeleted: data?.isDeleted,
						otp : data?.otp,
						isLoginAllowed: data?.isLoginAllowed,
						rememberMeToken:data?.rememberMeToken
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> AdminUserDao -> update", err);
			throw err;
		}
	}
}

module.exports = AdminUserDao;

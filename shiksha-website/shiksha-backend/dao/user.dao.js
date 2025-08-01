const User = require("../models/user.model.js");
const BaseDao = require("./base.dao.js");
const userAggregation = require("../aggregation/user.aggregation.js");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const UserActivityLogs = require("../models/user.activity.logs.model.js")

class UserDao extends BaseDao {
	constructor() {
		super(User);
	}

	async getUsersBySchoolId(schoolId) {
		try {
			const users = await User.find({ school: new ObjectId(schoolId) })
			return users;
		} catch (err) {
			console.log("Error --> UserDao -> getUsersBySchoolId()", err);
			throw err;
		}
	}

	async getAll(
		page = 1,
		limit,
		filters = {},
		sort = {},
		status
	) {
		try {
			let processedFilters = { ...filters , ...status }
	
			for (const key in filters) {
				if (key === "school") {
					processedFilters["school._id"] = new ObjectId(filters[key]);
					delete processedFilters["school"];
				}
			}
	
			let results = await userAggregation.getUserList(page,
				limit,
				processedFilters,
				sort);

				const totalItems =
				results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

	
			return {
				page,
				totalItems,
				limit: limit > 0 ? limit : totalItems,
				results: results[0].data,
			};
		} catch (err) {
			console.log("Error --> UserDao -> getAll()", err);
			throw err;
		}
	}

	async getById(userId) {
		try {
			const user = await User.findById(userId).populate("school","name facilities")
			return user;
		} catch (err) {
			console.log("Error --> UserDao -> getById()", err);
			throw err;
		}
	}

	async getByPhone(phone) {
		try {
			let user = await User.findOne({ phone }).populate("school", "_id name")
			if (user) return user;
			return false;
		} catch (err) {
			console.log("Error -> UserDao -> getByPhone", err);
		}
	}

	async update(id, data, session = null) {
		try {
			const result = await User.findOneAndUpdate(
				{
					_id: id,
				},
				{
					$set: {
						name: data?.name,
						email: data?.email,
						state: data?.state,
						zone: data?.zone,
						district: data?.district,
						block: data?.block,
						phone: data?.phone,
						password: data?.password,
						subjects: data?.subjects,
						address: data?.address,
						role: data?.role,
						school: data?.school,
						preferredLanguage: data?.preferredLanguage,
						classes: data?.classes,
						isProfileCompleted: data?.isProfileCompleted,
						facilities: data?.facilities,
						isDeleted: data?.isDeleted,
						profileImage: data?.profileImage,
						profileImageExpiresIn: data?.profileImageExpiresIn,
						otp: data?.otp,
						isLoginAllowed: data?.isLoginAllowed,
						rememberMeToken:data?.rememberMeToken
					},
				},
				{ new: true, useFindAndModify: false, session: session }
			);
			return result;
		} catch (err) {
			console.log("Error -> UserDao -> update", err);
			throw err;
		}
	}

	async setProfile(userId, profileData) {
		try {
			const user = await User.findById(userId);
			let updateData = {
				preferredLanguage: profileData.preferredLanguage,
				classes: profileData.classes,
				facilities: profileData.facilities,
			};

			if (!user.isProfileCompleted) {
				updateData.isProfileCompleted = true;
			}

			const updatedUser = await User.findByIdAndUpdate(
				userId,
				{ $set: updateData },
				{ new: true }
			).populate("school", "_id name");

			return updatedUser;
		} catch (err) {
			console.log("Error --> UserDao -> setProfile()", err);
			throw err;
		}
	}


	async activityLog(userId,data){
		try{
			const { planId, draftId, idleTime, interactionTime, moduleName, isCompleted } = data;

			if (draftId) {
				let activityLog = await UserActivityLogs.findOne({ draftId , userId});
	
				if (activityLog) {
					activityLog.idleTime = (activityLog.idleTime || 0) + idleTime;
					activityLog.interactionTime = (activityLog.interactionTime || 0) + interactionTime;
					activityLog.isCompleted = isCompleted; 
	
					if (isCompleted) {
						activityLog.draftId = undefined; 
					}
	
					await activityLog.save();
					return activityLog
				} else {
					activityLog = new UserActivityLogs({
						planId,
						draftId,
						idleTime,
						interactionTime,
						moduleName,
						userId,
						isCompleted
					});
	
					await activityLog.save();
					return activityLog
				}
			} else if(planId)
				{
					const activityLog = new UserActivityLogs({
						planId,
						idleTime,
						interactionTime,
						moduleName,
						userId
					});
	
					await activityLog.save();
					return activityLog
				}
			else {
				const activityLog = new UserActivityLogs({
					idleTime,
					interactionTime,
					moduleName,
					userId
				});
	
				await activityLog.save();
				return activityLog
			}

		
		}catch(err){
			console.log("Error --> UserDao -> activity", err);
			throw err;
		}
	}
}

module.exports = UserDao;

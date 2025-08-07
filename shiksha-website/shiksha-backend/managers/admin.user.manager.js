require("dotenv").config();
const BaseManager = require("./base.manager");
const AdminUserDao = require("../dao/admin.user.dao");
const formatApiReponse = require("../helper/response");
const ExcelJS = require("exceljs");
const { sendWelcomeSMS } = require("../helper/worker.helper");
const {
	adminUserSchemaCreate,
} = require("../validations/admin.user.validation");
const { MESSAGES } = require("../config/constants");
const dashboardAggregation = require("../aggregation/admin.dashboard.aggregation");
const RegeneratedLessonResourceDao = require("../dao/regenerate.log.dao");
const { Worker } = require("worker_threads");
const path = require("path");


class AdminUserManager extends BaseManager {
	constructor() {
		super(new AdminUserDao());
		this.adminUserDao = new AdminUserDao();
		this.regeneratedLogDao = new RegeneratedLessonResourceDao();
	}

	async create(req) {
		try {
			const existingAdminUser = await this.adminUserDao.getByPhone(
				req.body.phone
			);

			if (existingAdminUser)
				return { success: false, message: "Phone number already exists!" };

			const result = await this.adminUserDao.create(req.body);

			sendWelcomeSMS(req.body.phone, req.body.name).catch((error) => {
				console.error("Error sending welcome SMS:", error);
			});

			return { success: true, data: result, message: "Admin user created" };
		} catch (err) {
			return { success: false, data: false, message: "Something went wrong" };
		}
	}

	async getByPhone(req) {
		try {
			let data = await this.adminUserDao.getByPhone(req.body.phone);
			if (data) return formatApiReponse(true, "", data);
			return formatApiReponse(false, "", null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async update(id, payload) {
		try {
			let admin = await this.adminUserDao.getOne({
				_id: id,
				phone: payload.phone,
			});

			if (admin) {
				const isPhoneChanged = admin.phone !== payload.phone;
				const isRoleChanged = JSON.stringify(admin.role) !== JSON.stringify(payload.role);
	
				if (isPhoneChanged || isRoleChanged) {
					payload.isLoginAllowed = false;
				}
	
				admin = await this.adminUserDao.update(id, payload);
				if (admin) {
					return formatApiReponse(true, MESSAGES.UPDATE_SUCCESS, admin.phone);
				}
			}

			admin = await this.adminUserDao.getOne({ phone: payload.phone });

			if (admin) {
				return formatApiReponse(
					false,
					`${payload.role} with this phone number already exists!`,
					null
				);
			}

			let originalUserRecord = await  this.adminUserDao.getOne({ _id: id })

			const isPhoneChanged = originalUserRecord && originalUserRecord.phone !== payload.phone;
			if (isPhoneChanged)
			payload.isLoginAllowed = false;

			admin = await this.adminUserDao.update(id, payload);

			if (admin) {
				return formatApiReponse(true, MESSAGES.UPDATE_SUCCESS, admin.phone);
			}

			return formatApiReponse(false, MESSAGES.UPDATE_FAIL, null);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async bulkUpload(fileBuffer) {
		try {
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(fileBuffer);
			const worksheet = workbook.getWorksheet(1);
			const adminUserData = [];
			const validationErrors = [];
			const phoneNumbers = new Set();

			for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
				const row = worksheet.getRow(rowNumber);
				if (!row.getCell(1).value) {
					continue;
				}
				console.log(row.getCell(3).value);
				const adminUserDataRow = {
					name: row.getCell(1).value,
					phone: row.getCell(2).value?.toString(),
					email: row.getCell(3).value?.text,
					address: row.getCell(4).value,
					role: row
						.getCell(5)
						.value?.toString()
						?.split("|")
						.map((role) => role.trim()),
				};

				const { error } = adminUserSchemaCreate.validate(adminUserDataRow);

				if (error) {
					console.log(`Error in row ${rowNumber}: ${error.message}`);
					validationErrors.push({ row: rowNumber, message: error.message });
				} else {
					if (phoneNumbers.has(adminUserDataRow.phone)) {
						validationErrors.push({
							row: rowNumber,
							message: `Duplicate phone number ${adminUserDataRow.phone} found within the file`,
						});
						continue;
					}

					phoneNumbers.add(adminUserDataRow.phone);

					const existingAdminUser = await this.adminUserDao.getByPhone(
						adminUserDataRow.phone
					);
					if (existingAdminUser) {
						validationErrors.push({
							row: rowNumber,
							message: `Phone number ${adminUserDataRow.phone} already exists`,
						});
						continue;
					}

					adminUserData.push(adminUserDataRow);
				}
			}

			if (validationErrors.length === 0) {
				const result = await this.adminUserDao.bulkUpload(adminUserData);
				adminUserData.forEach((user) => {
					sendWelcomeSMS(user.phone, user.name).catch((error) => {
						console.error("Error sending welcome SMS:", error);
					});
				});
				return { success: true, message: "Bulk upload successful", result };
			} else {
				return {
					success: false,
					message: "Bulk upload failed due to validation errors",
					validationErrors,
				};
			}
		} catch (err) {
			console.log("Error in bulk upload:", err);
			return { success: false, error: "An error occurred during bulk upload" };
		}
	}

	async getContentActivity(page, limit, filters = {}, sort = {}) {
		try {
			let result = await this.regeneratedLogDao.getContentActivity(
				page,
				limit,
				filters,
				sort
			);

			return formatApiReponse(true, "", result);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async exportContentActivity(req) {
		try {
			const {
				filter = {},
				search = "",
			} = req.query;

			const searchFilter = {};

			if (search) {
				const searchFields = [
					"user.name",
					"user.school.name",
					"content.name",
					"content.topics",
				];

				const regexExpressions = searchFields.map((field) => ({
					[field]: { $regex: new RegExp(search, "i") },
				}));

				searchFilter.$or = regexExpressions;
			}
		  
		const contentActivities = await this.regeneratedLogDao.getAllContentActivity(
			{ ...filter, ...searchFilter }
		)
		 
		  const userId = req?.user?._id;
	
		  const userName = req?.user?.name;
	
		  const worker = new Worker(
			path.resolve(__dirname, "../worker/exportcontentactivityworker.js")
		  );

		  worker.postMessage({
			contentActivities: contentActivities.results,
			userId: userId.toString(),
			userName,
		  });
	
		  worker.on("message", (result) => {
			console.log("Worker result:", result);
		  });
	
		  worker.on("error", (err) => {
			console.error("Worker error:", err);
		  });
	
		  worker.on("exit", (code) => {
			if (code !== 0) {
			  console.error(`Worker stopped with exit code ${code}`);
			}
		  });
	
		  return formatApiReponse(
			true,
			"Content Activity export initiated, please verify for audit logs!",
			""
		  );
		} catch (err) {
		  return formatApiReponse(false, err.message, e);
		}
	  }

	async getDashboardMetrics(filters) {
		try {
			const metrics = await dashboardAggregation.getDashboardMetrics(filters);
			return { success: true, data: metrics };
		} catch (err) {
			console.error("Error in getDashboardMetrics:", err);
			return { success: false, error: err.message };
		}
	}
}
module.exports = AdminUserManager;

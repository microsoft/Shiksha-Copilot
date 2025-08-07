require("dotenv").config();
const BaseManager = require("./base.manager");
const UserDao = require("../dao/user.dao");
const SchoolDao = require("../dao/school.dao");
const {
  getClasswithGroupedSubjects,
} = require("../aggregation/user.aggregation");
const { Worker } = require("worker_threads");
const formatApiReponse = require("../helper/response");
const path = require("path");
const ExcelJS = require("exceljs");
const { sendWelcomeSMS } = require("../helper/worker.helper");
const { MESSAGES } = require("../config/constants");
const ClassDao = require("../dao/school.class.dao");

class UserManager extends BaseManager {
  constructor() {
    super(new UserDao());
    this.userDao = new UserDao();
    this.schoolDao = new SchoolDao();
    this.classDao = new ClassDao();
  }

  async create(req) {
    try {
      const existingUser = await this.userDao.getByPhone(req.body.phone);

      if (existingUser)
        return { success: false, message: "Phone already exists!" };

      const school = await this.schoolDao.getById(req.body.school);

      if (!school) return { success: false, message: "School does not exist!" };

      const result = await this.userDao.create(req.body);

      sendWelcomeSMS(req.body.phone, req.body.name).catch((error) => {
        console.error("Error sending welcome SMS:", error);
      });

      return { success: true, data: result, message: "Teacher created" };
    } catch (err) {
      return { success: false, data: false, message: "Something went wrong" };
    }
  }

  async getProfileById(id) {
    try {
      let user = await this.userDao.getById(id);

      let plainUser = user.toObject();

      let groupByBoards = await this.classDao.getGroupClassesByBoard(
        user.school
      );

      let groupedClasseswithSubjects = await getClasswithGroupedSubjects(id);

      plainUser.classes = groupedClasseswithSubjects.map((classItem) => {
        const board = groupByBoards.find(
          (item) => item._id === classItem.board
        );
        const medium = board.medium.find(
          (item) => item.medium === classItem.medium
        );
        const standard = medium.classDetails.find(
          (item) => item.standard === classItem.class
        );

        return {
          board: classItem.board,
          class: classItem.class,
          sem: classItem.sem,
          subject: classItem.name,
          medium: classItem.medium,
          subjectDetails: classItem.subjects,
          boysStrength: standard.boysStrength,
          girlsStrength: standard.girlsStrength,
        };
      });

      return {
        success: true,
        data: plainUser,
        message: "Teacher profile retreived successfully",
      };
    } catch (err) {
      return {
        success: false,
        data: false,
        message: "Something went wrong",
        err,
      };
    }
  }

  async getByPhone(req) {
    try {
      let data = await this.userDao.getByPhone(req.body.phone);
      if (data) return formatApiReponse(true, "", data);
      return formatApiReponse(false, "", null);
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async update(id, payload) {
    try {
      let user = await this.userDao.getOne({
        _id: id,
        phone: payload.phone,
      });
      const isRoleChanged =
        user && JSON.stringify(...user.role) !== JSON.stringify(payload.role);
      if (user) {
        if (payload.isSchoolChanged) {
          payload.isProfileCompleted = false;
          payload.classes = [];
          payload.isLoginAllowed = false;
        }
        if (isRoleChanged) payload.isLoginAllowed = false;

        user = await this.userDao.update(id, payload);
        if (user)
          return formatApiReponse(true, MESSAGES.UPDATE_SUCCESS, user.phone);
      }

      user = await this.userDao.getOne({ phone: payload.phone });
      if (user) {
        return formatApiReponse(
          false,
          `Teacher with this phone number already exists!`,
          null
        );
      }

      let originalUserRecord = await this.userDao.getOne({ _id: id });

      if (payload.isSchoolChanged) {
        payload.isProfileCompleted = false;
        payload.classes = [];
      }

      const isPhoneChanged =
        originalUserRecord && originalUserRecord.phone !== payload.phone;
      if (isPhoneChanged) payload.isLoginAllowed = false;

      user = await this.userDao.update(id, payload);

      if (user) {
        return formatApiReponse(true, MESSAGES.UPDATE_SUCCESS, user.phone);
      }

      return formatApiReponse(false, MESSAGES.UPDATE_FAIL, null);
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async bulkUpload(fileBuffer, userId, userName) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        return { success: false, message: "No worksheet found in the file." };
      }

      const expectedSheetName = "teacher";
      if (worksheet.name !== expectedSheetName) {
        return {
          success: false,
          message: "Invalid template: Sheet name should be 'teacher'.",
        };
      }

      const expectedHeaders = ["name", "phone", "diseCode", "role"];
      const actualHeaders = worksheet
        .getRow(1)
        .values.slice(1)
        .map((header) => header?.toString().toLowerCase());

      expectedHeaders.forEach((header, index) => {
        if (header.toLowerCase() !== actualHeaders[index]) {
          return {
            success: false,
            message:
              "Invalid template: Column headers do not match expected headers.",
          };
        }
      });

      const worksheetData = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const isEmptyRow = row.values.every(
          (cell) => cell === null || cell === undefined || cell === ""
        );
        if (isEmptyRow) return;

        const rowData = {
          name: row.getCell(1).value?.toString(),
          phone: row.getCell(2).value?.toString(),
          school: row.getCell(3).value?.toString(),
          role: row
            .getCell(4)
            .value?.toString()
            ?.split("|")
            .map((role) => role.trim()),
        };

        worksheetData.push(rowData);
      });

      const worker = new Worker(
        path.resolve(__dirname, "../worker/userworker.js"),
        { workerData: { worksheetData, userId, userName } }
      );

      worker.on("message", (message) => {
        if (!message.success) {
          console.error("Worker message error:", message.message);
        } else {
          console.log("Worker completed successfully:", message);
        }
      });

      worker.on("error", (error) => {
        console.error("Worker error:", error);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });
      return { success: true };
    } catch (err) {
      console.log("Error --> UserManager -> BulkUpload()", err);
      return { success: false, error: err };
    }
  }

  async getById(userId) {
    try {
      const user = await this.userDao.getById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }
      return { success: true, data: user };
    } catch (err) {
      console.log("Error --> UserManager -> getById()", err);
      return { success: false, error: err };
    }
  }

  async setProfile(userId, profileData) {
    try {
      const updatedUser = await this.userDao.setProfile(userId, profileData);
      if (!updatedUser) {
        return formatApiReponse(false, "Teacher not found", null);
      }
      return formatApiReponse(true, "Saved Teacher Info!", updatedUser);
    } catch (err) {
      console.log("Error --> UserManager -> setProfile()", err);
      return { success: false, error: err };
    }
  }

  async uploadProfileImage(userId, filePath) {
    try {
      let user = await this.userDao.getById(userId);
      if (!user) {
        return { success: false, message: "Teacher not found" };
      }

      let expireLimit = 5 * 24 * 60 * 60;

      user = await this.userDao.update(userId, {
        profileImage: filePath,
        profileImageExpiresIn:
          parseInt(Date.now() / 1000) + Number(expireLimit),
      });

      if (!user) {
        return {
          success: false,
          message: "Failed to update image!",
          data: null,
        };
      }

      return {
        success: true,
        message: "Image uploaded successfully!",
        data: user,
      };
    } catch (err) {
      console.log("Error --> UserManager -> uploadProfileImage()", err);
      return { success: false, message: "Error uploading image", data: err };
    }
  }

  async removeProfileImage(userId) {
    try {
      let user = await this.userDao.getById(userId);
      if (!user) {
        return { success: false, message: "Teacher not found" };
      }

      user = await this.userDao.update(user._id, {
        profileImage: "",
        profileImageExpiresIn: parseInt(Date.now() / 1000),
      });

      if (!user) {
        return { success: false, message: "Failed to remove profile!" };
      }

      return {
        success: true,
        message: "Profile Image removed sucessfully!",
        data: user,
      };
    } catch (err) {
      console.log("Error --> UserManager -> removeProfileImage()", err);
      return { success: false, message: "Error removing image", data: err };
    }
  }

  async activate(userId) {
    try {
      const user = await this.userDao.getById(userId);
      const school = await this.schoolDao.getOne({ _id: user.school });
      if (school.isDeleted) {
        return formatApiReponse(
          false,
          "Cannot activate user since school is deactivated!",
          null
        );
      }
      if (!user) {
        return formatApiReponse(false, "Teacher not found", null);
      }


      if (!user.isDeleted) {
        return formatApiReponse(false, "Teacher is already active", null);
      }

      const updatedUser = await this.userDao.update(userId, {
        isDeleted: false,
      });
      return formatApiReponse(
        true,
        "Teacher activated successfully",
        updatedUser.name
      );
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async deactivate(userId) {
    try {
      const user = await this.userDao.getById(userId);

      if (!user) {
        return formatApiReponse(false, "Teacher not found", null);
      }
      if (user.isDeleted) {
        return formatApiReponse(false, "Teacher is already inactive", null);
      }
      const updatedUser = await this.userDao.update(userId, {
        isDeleted: true,
      });

      return formatApiReponse(
        true,
        "Teacher deactivated successfully",
        updatedUser.name
      );
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async updatePreferredLanguage(userId, preferredLanguage) {
    try {
      const user = await this.userDao.getById(userId);

      if (!user) {
        return formatApiReponse(false, "Teacher not found", null);
      }

      await this.userDao.update(userId, { preferredLanguage });

      return formatApiReponse(true, "Language updated successfully", null);
    } catch (err) {
      console.log("Error --> UserController -> updatePreferredLanguage()", err);
      return res.status(400).json(err);
    }
  }

  async export(req) {
    try {
      const {
        page = 1,
        limit,
        filter = {},
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        includeDeleted,
      } = req.query;
      const sortOrderObject =
        sortOrder === "desc" ? { [sortBy]: -1 } : { [sortBy]: 1 };

      const searchFilter = {};

      if (search) {
        const searchFields = ["name", "phone"];

        const regexExpressions = searchFields.map((field) => ({
          [field]: { $regex: new RegExp(search, "i") },
        }));

        if (!isNaN(parseInt(search))) {
          regexExpressions.push({ schoolId: parseInt(search) });
        }

        searchFilter.$or = regexExpressions;
      }

      const transformedFilter = { ...filter };
      if (transformedFilter._id) {
        try {
          transformedFilter._id = new ObjectId(transformedFilter._id);
        } catch (err) {
          console.error("Invalid _id format:", transformedFilter._id);
          return res.status(400).json({ error: "Invalid _id format" });
        }
      }
      const mergedFilter = { ...transformedFilter, ...searchFilter };

      let status = {};

      if (includeDeleted === "2") {
        status = { isDeleted: true };
      } else if (includeDeleted === "0") {
        status = { isDeleted: false };
      }
      const users = await this.userDao.getAll(
        parseInt(page),
        parseInt(limit),
        mergedFilter,
        sortOrderObject,
        status,
        req?.user?._id
      );

      const userId = req?.user?._id;

      const userName = req?.user?.name;

      const worker = new Worker(
        path.resolve(__dirname, "../worker/exportuserworker.js")
      );

      worker.postMessage({
        users: users.results,
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
        "Teacher export initiated, please verify for audit logs!",
        ""
      );
    } catch (err) {
      return formatApiReponse(false, err.message, e);
    }
  }


 async activityLog(req){
  try{
    const { _id } = req.user;
    const userActivity = await this.userDao.activityLog(_id,req.body);
      return formatApiReponse(true, "Logs saved successfully!", userActivity);
  }
  catch (err) {
    return formatApiReponse(false, err.message, e);
  }
 }
}

module.exports = UserManager;

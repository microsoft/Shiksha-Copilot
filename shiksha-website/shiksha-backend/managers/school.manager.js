const BaseManager = require("./base.manager");
const formatApiReponse = require("../helper/response");
const SchoolDao = require("../dao/school.dao");
const ClassDao = require("../dao/school.class.dao");
const UserDao = require("../dao/user.dao");
const path = require("path");
const ExcelJS = require("exceljs");
const schoolAggregation = require("../aggregation/school.aggregation");
const { Worker } = require("worker_threads");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

class SchoolManager extends BaseManager {
  constructor() {
    super(new SchoolDao());
    this.schoolDao = new SchoolDao();
    this.classDao = new ClassDao();
    this.userDao = new UserDao();
  }

  async create(req, session) {
    try {
      await session.startTransaction();
      let classes = req.body?.classes;
      let school = await this.schoolDao.getOne({ schoolId: req.body.schoolId });

      if (school) {
        await session.abortTransaction();
        return formatApiReponse(false, "Disecode already exists", null);
      }

      school = await this.schoolDao.create(req.body);

      if (!school) {
        await session.abortTransaction();
        return formatApiReponse(false, "Failed to save school info", null);
      }

      let classCreates = [];

      for (let _class of classes) {
        let classPayload = {
          ..._class,
          schoolId: school._id,
        };

        classCreates.push(this.classDao.create(classPayload));
      }

      classes = await Promise.all(classCreates);

      if (classes) {
        await session.commitTransaction();
        return formatApiReponse(true, "saved school and class info", {
          ...school.toObject(),
          classes: classes,
        });
      }

      await session.abortTransaction();

      return formatApiReponse(false, "", null);
    } catch (err) {
      await session.abortTransaction();
      return formatApiReponse(false, err?.message, err);
    }
  }

  async getById(req) {
    try {
      let schoolId = req.params.id;

      let [school] = await schoolAggregation.getSchoolById(schoolId);

      if (!school) {
        return formatApiReponse(false, "school not found", null);
      }

      let classes = await this.classDao.getClassesBySchoolId(schoolId);

      return formatApiReponse(true, "", { ...school, classes });
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }

  async update(id, data) {
    try {
      const { classes: classesData } = data;

      const currentSchool = await this.schoolDao.getById(id);

      const existingSchool = await this.schoolDao.getBySchoolId(data.schoolId);

      if (
        existingSchool &&
        currentSchool.schoolId !== existingSchool.schoolId
      ) {
        return formatApiReponse(
          false,
          "School with this Dise Code already exists!",
          null
        );
      }

      const updatedSchool = await this.schoolDao.update(id, data);

      if (!updatedSchool) {
        return formatApiReponse(false, "Failed to update school info", null);
      }

      for (let classData of classesData) {
        let classRecord;
        if (classData._id) {
          const { classDetails, ...classDataWithoutDetails } = classData;
          classRecord = await this.classDao.update(
            classData._id,
            classDataWithoutDetails
          );
          const existingClassDetailIds = (classRecord.classDetails || []).map(
            (detail) => detail._id?.toString()
          );
          const updatedClassDetails = [];
          for (let classDetail of classData.classDetails) {
            if (classDetail._id) {
              updatedClassDetails.push(
                this.classDao.updateOne(
                  { _id: classRecord._id, "classDetails._id": classDetail._id },
                  {
                    $set: {
                      "classDetails.$.girlsStrength": classDetail.girlsStrength,
                      "classDetails.$.boysStrength": classDetail.boysStrength,
                      "classDetails.$.totalStrength":
                        Number(classDetail.boysStrength) +
                        Number(classDetail.girlsStrength),
                    },
                  }
                )
              );
            } else {
              if (
                !existingClassDetailIds.includes(classDetail._id?.toString())
              ) {
                classDetail._id = new mongoose.Types.ObjectId();
                updatedClassDetails.push(
                  this.classDao.updateOne(
                    { _id: classRecord._id },
                    { $push: { classDetails: classDetail } }
                  )
                );
              }
            }
          }
          await Promise.all(updatedClassDetails);
        } else {
          const existingClass = await this.classDao.getOne({
            board: classData.board,
            medium: classData.medium,
            isDeleted: false,
            schoolId: updatedSchool._id,
          });
          if (existingClass) {
            return formatApiReponse(
              false,
              "Class with this board, medium already exists!",
              null
            );
          }
          classData.schoolId = updatedSchool._id;
          classRecord = await this.classDao.create(classData);
        }
      }
      const updatedClasses = await this.classDao.getClassesBySchoolId(
        updatedSchool._id
      );

      if (updatedClasses) {
        return formatApiReponse(true, "Updated school and class info", {
          ...updatedSchool.toObject(),
          classes: updatedClasses,
        });
      }
      return formatApiReponse(false, "Failed to update classes", null);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async bulkUpload(fileBuffer, userId, userName) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const expectedSchoolHeaders = [
        "diseCode",
        "name",
        "board",
        "state",
        "zone",
        "district",
        "taluk",
        "medium",
        "academicYearStartDate",
        "academicYearEndDate",
      ];

      const expectedClassHeaders = [
        "diseCode",
        "board",
        "medium",
        "standard",
        "boys",
        "girls",
      ];

      const validateHeaders = (sheet, expectedHeaders) => {
        const actualHeaders = sheet.getRow(1).values.slice(1);
        if (actualHeaders.length !== expectedHeaders.length) {
          return `Do not alter the column headers!`;
        }
        for (let i = 0; i < expectedHeaders.length; i++) {
          if (actualHeaders[i] !== expectedHeaders[i]) {
            return `Do not alter the column headers!`;
          }
        }
        return null;
      };

      const schoolSheet = workbook.getWorksheet("school");
      const classSheet = workbook.getWorksheet("class");

      if (schoolSheet) {
        const schoolHeaderError = validateHeaders(
          schoolSheet,
          expectedSchoolHeaders
        );
        if (schoolHeaderError) {
          return formatApiReponse(
            false,
            "Invalid school sheet template!",
            null
          );
        }
      } else {
        return formatApiReponse(false, "School sheet is missing!", null);
      }

      if (classSheet) {
        const classHeaderError = validateHeaders(
          classSheet,
          expectedClassHeaders
        );
        if (classHeaderError) {
          return formatApiReponse(false, "Invalid class sheet template!", null);
        }
      } else {
        return formatApiReponse(false, "Class sheet is missing!", null);
      }

      const worker = new Worker(
        path.resolve(__dirname, "../worker/bulkuploadworker.js")
      );

      worker.postMessage({ fileBuffer, userId ,userName });

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

      return { success: true };
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async delete(req) {
    try {
      let data = await this.schoolDao.delete(req.params?.id);
      return formatApiReponse(true, "", data);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async updateFacility(id,body) {
    try {
      let data = await this.schoolDao.getById(id);
      let schoolfacilities = data?.facilities;
      const updatedFacilities = schoolfacilities.filter((ele)=> ele.otherType !== body.otherType);

      const school = await this.schoolDao.update(id,{facilities:updatedFacilities})

      const users = await this.userDao.getUsersBySchoolId(id);

      const hasFacilityUsers = users.filter((ele)=> ele.facilities.some((facility)=> facility.type === body.otherType));

      for(let i=0; i<hasFacilityUsers.length; i++){
        let user = hasFacilityUsers[i]
        const updatedUserFacility = user.facilities.filter((ele)=> ele.type !== body.otherType);
        await this.userDao.update(user._id,{facilities:updatedUserFacility})
      }

      return formatApiReponse(true, "Resource Deleted!", school);
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async deactivate(req) {
    try {
      const schoolId = req.params.id;

      const school = await this.schoolDao.update(schoolId, { isDeleted: true });

      if (!school) {
        return formatApiReponse(false, "Failed to deactivate school", null);
      }

      const users = await this.userDao.getUsersBySchoolId(schoolId);
      const userDeactivations = users.map((user) =>
        this.userDao.update(user._id, { isDeleted: true })
      );
      await Promise.all(userDeactivations);

      return formatApiReponse(
        true,
        "School and associated users deactivated successfully",
        {
          school,
          users,
        }
      );
    } catch (err) {
      return formatApiReponse(false, err.message, err);
    }
  }

  async exportSchool(req){
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

			if (includeDeleted === '2') {
				status = { isDeleted: true }; 
			} else if (includeDeleted === '0') {
				status = { isDeleted: false }; 
			}
      

      const schools = await this.schoolDao.getAll(
        parseInt(page),
				parseInt(limit),
				mergedFilter,
				sortOrderObject,
				status,
				req?.user?._id
      );

      const userId = req.user._id;
			const userName = req.user.name;

      const worker = new Worker(
        path.resolve(__dirname,'../worker/exportschoolworker.js')
      );

      worker.postMessage({schools:schools.results,userId:userId.toString(),userName});

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

      return formatApiReponse(true, "School export initiated, please verify for audit logs!","")
      
    }
    catch(err){
      return formatApiReponse(false, err.message, err);
    }
  }
}

module.exports = SchoolManager;

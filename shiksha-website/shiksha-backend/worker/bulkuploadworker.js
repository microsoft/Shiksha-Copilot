const { parentPort } = require("worker_threads");
const ExcelJS = require("exceljs");
const School = require("../models/school.model");
const SchoolManager = require("../managers/school.manager");
const schoolManager = new SchoolManager();
const { schoolSchema } = require("../validations/school.validation");
const { classSchema } = require("../validations/school.class.validation");
const dbService = require("../config/db.js");
const { uploadToStorage } = require("../services/azure.blob.service");
const checkRegionValidation = require("../helper/region.helper");
const AuditLog = require("../models/audit.log.model");

dbService.getConnection().then(async (client) => {

  const processSheet = (
    worksheet,
    schema,
    dataArray,
    mapRowData,
    validationErrors
  ) => {
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const isEmptyRow = row.values.every(
        (cell) => cell === null || cell === undefined || cell === ""
      );
      if (isEmptyRow) return;

      const rowData = mapRowData(row);
      rows.push({ rowData, rowNumber });
    });

    rows.forEach(({ rowData, rowNumber }) => {
      const { error } = schema.validate(rowData);
      if (error) {
        validationErrors.push({
          row: rowNumber,
          schoolId: rowData.schoolId,
          schoolName: rowData.name,
          message: error.message,
        });
      } else {
        dataArray.push({ ...rowData, rowNumber });
      }
    });
  };

  const mapSchoolRowData = (row) => {
    const toArray = (value) => {
      if (!value) return [];
      return typeof value === "string"
        ? value.split(",").map((item) => item.trim())
        : Array.isArray(value)
        ? value
        : [];
    };

    const toUpperCaseArray = (value) => {
      return toArray(value).map((item) => item.toUpperCase());
    };

    const toLowerCaseArray = (value) => {
      return toArray(value).map((item) => item.toLowerCase());
    };

    return {
      schoolId: row.getCell(1).value,
      name: row.getCell(2).value.trim(),
      boards: toUpperCaseArray(row.getCell(3).value),
      state: row.getCell(4).value,
      zone: row.getCell(5).value,
      district: row.getCell(6).value,
      block: row.getCell(7).value,
      mediums: toLowerCaseArray(row.getCell(8).value),
      academicYearStartDate: row.getCell(9).value,
      academicYearEndDate: row.getCell(10).value,
    };
  };

  const mapClassRowData = (row) => ({
    schoolId: row.getCell(1).value,
    board: row.getCell(2).value,
    medium: row.getCell(3).value,
    standard: row.getCell(4).value,
    boys: row.getCell(5).value,
    girls: row.getCell(6).value,
  });

  const groupClassData = (classData) => {
    return classData.reduce((acc, curr) => {
      if (!acc[curr.schoolId]) {
        acc[curr.schoolId] = [];
      }
      const { schoolId, ...rest } = curr;
      acc[curr.schoolId].push(rest);
      return acc;
    }, {});
  };

  const validateAndPrepareData = async (
    schoolData,
    classData,
    validationErrors
  ) => {
    const schoolIds = schoolData.map((school) => school.schoolId);
    const existingSchools = await School.find({ schoolId: { $in: schoolIds } });
    const schoolCache = new Map(
      existingSchools.map((school) => [school.schoolId, school])
    );

    const groupedClassData = groupClassData(classData);
    const results = [];
    const processedSchoolIds = new Set();

    for (let rowIndex = 0; rowIndex < schoolData.length; rowIndex++) {
      const school = schoolData[rowIndex];
      if (school) {
        const existingSchool = schoolCache.get(school.schoolId);

        if (existingSchool) {
          validationErrors.push({
            row: school.rowNumber,
            schoolId: school.schoolId,
            schoolName: school.name,
            message: `School with diseCode ${school.schoolId} already exists`,
          });
          continue;
        }
        const regionValidation = await checkRegionValidation(
          school.state,
          school.zone,
          school.district,
          school.block
        );
        if (regionValidation.error) {
          validationErrors.push({
            row: school.rowNumber,
            schoolId: school.schoolId,
            schoolName: school.name,
            message: regionValidation.message,
          });
          continue;
        }
        if (processedSchoolIds.has(school.schoolId)) {
          validationErrors.push({
            row: school.rowNumber,
            schoolId: school.schoolId,
            schoolName: school.name,
            message: `Duplicate diseCode ${school.schoolId} in data`,
          });
          continue;
        }
        processedSchoolIds.add(school.schoolId);

        if (
          new Date(school.academicYearStartDate) >=
          new Date(school.academicYearEndDate)
        ) {
          validationErrors.push({
            row: school.rowNumber,
            schoolId: school.schoolId,
            schoolName: school.name,
            message: `Academic year start date should be earlier than end date`,
          });
          return;
        }

        const classes = groupedClassData[school.schoolId] || [];
        const invalidClasses = classes.filter(
          (c) =>
            !school.boards.includes(c.board.toUpperCase()) ||
            !school.mediums.includes(c.medium.toLowerCase())
        );

        if (invalidClasses.length > 0) {
          validationErrors.push({
            row: school.rowNumber,
            schoolId: school.schoolId,
            schoolName: school.name,
            message: `Board or Medium mismatch between school and classes`,
          });
          continue;
        }

        const groupedData = groupClassesByBoardAndMedium(classes);
        results.push({ school, groupedData });
      }
    }

    return results;
  };

  const groupClassesByBoardAndMedium = (classes) => {
    const groupedData = [];
    const groupByBoardAndMedium = classes.reduce((acc, curr) => {
      const key = `${curr.board.toUpperCase()}-${curr.medium.toLowerCase()}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(curr);
      return acc;
    }, {});

    for (const key in groupByBoardAndMedium) {
      const groupedClasses = groupByBoardAndMedium[key];
      const standards = groupedClasses.map((c) => c.standard);
      const start = Math.max(1, Math.min(...standards));
      const end = Math.min(10, Math.max(...standards));

      const classDetails = [];
      for (let i = start; i <= end; i++) {
        const classForStandard = groupedClasses.find((c) => c.standard === i);
        if (classForStandard) {
          classDetails.push({
            standard: classForStandard.standard,
            girlsStrength: classForStandard.girls,
            boysStrength: classForStandard.boys,
            totalStrength: classForStandard.boys + classForStandard.girls,
          });
        } else {
          classDetails.push({
            standard: i,
            girlsStrength: 0,
            boysStrength: 0,
            totalStrength: 0,
          });
        }
      }

      groupedData.push({
        board: groupedClasses[0].board.toUpperCase(),
        medium: groupedClasses[0].medium.toLowerCase(),
        start,
        end,
        classDetails,
      });
    }

    return groupedData;
  };

  const createSchoolsWithClasses = async (schoolDataWithClasses, session) => {
    const results = [];
    const errorMessages = [];
    try {
      for (const { school, groupedData } of schoolDataWithClasses) {
        const req = {
          body: {
            ...school,
            classes: groupedData,
          },
        };

        const createResult = await schoolManager.create(req, session);
        if (createResult.success) {
          results.push(createResult);
        } else {
          errorMessages.push({
            schoolId: school.schoolId,
            message: createResult.message,
          });
        }
      }
    } catch (error) {
      errorMessages.push({
        schoolId: null,
        message: `Unexpected error processing schools: ${error.message}`,
      });
    }
    return {
      results,
      errorMessages,
    };
  };

  parentPort.on("message", async (data) => {
    const { fileBuffer, userId , userName } = data;
    const session = await client.startSession();

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const schoolData = [];
      const classData = [];
      const validationErrors = [];
      const processWorkbook = async (workbook) => {
        try {
          const schoolSheet = workbook.getWorksheet("school");
          const classSheet = workbook.getWorksheet("class");

          if (schoolSheet) {
            processSheet(
              schoolSheet,
              schoolSchema,
              schoolData,
              mapSchoolRowData,
              validationErrors
            );
          }

          if (classSheet) {
            processSheet(
              classSheet,
              classSchema,
              classData,
              mapClassRowData,
              validationErrors
            );
          }
        } catch (err) {
          parentPort.postMessage({
            success: false,
            message: `Error processing workbook: ${err.message}`,
          });
          return;
        }
      };

      await processWorkbook(workbook);

      const schoolDataWithClasses = await validateAndPrepareData(
        schoolData,
        classData,
        validationErrors
      );

      if (validationErrors.length > 0) {
        const errorWorkbook = new ExcelJS.Workbook();
        const errorSheet = errorWorkbook.addWorksheet("Validation Errors");
        const uniqueFilename = `School-Error-Log-${userId.toString()}--${Date.now()}`;
        errorSheet.columns = [
          { header: "Row Number", key: "row", width: 15 },
          { header: "DiseCode", key: "schoolId", width: 20 },
          { header: "School Name", key: "schoolName", width: 30 },
          { header: "Error Message", key: "message", width: 50 },
        ];

        validationErrors.forEach((error) => {
          errorSheet.addRow(error);
        });

        try {
          const errorFileBuffer = await errorWorkbook.xlsx.writeBuffer();
          const errorUrl = await uploadToStorage(
            errorFileBuffer,
            uniqueFilename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );

          await AuditLog.create({
            eventType: "Schools Import",
            status: "failure",
            logUrl: errorUrl,
            userId,
            name:userName
          });
          parentPort.postMessage({
            success: false,
            message:
              "Bulk upload completed with validation errors. Valid Data if present will be processed.",
            errorUrl,
          });
        } catch (uploadError) {
          parentPort.postMessage({
            success: false,
            message:
              "Failed to upload error log, but processing will continue.",
            error: uploadError.message,
          });
        }
      }

      if (schoolDataWithClasses?.length > 0) {
        try {
          let { results, errorMessages } = await createSchoolsWithClasses(
            schoolDataWithClasses,
            session
          );
          const totalRecords = schoolDataWithClasses.length;
          const successCount = results.length;
          const failureCount = totalRecords - results.length;
          const workbook = new ExcelJS.Workbook();

          const summarySheet = workbook.addWorksheet("Summary");
          summarySheet.columns = [
            {
              header: "Total Records Processed",
              key: "totalRecords",
              width: 30,
            },
            { header: "Success Count", key: "successCount", width: 20 },
            { header: "Failure Count", key: "failureCount", width: 20 },
          ];

          summarySheet.addRow({
            totalRecords: totalRecords,
            successCount: successCount,
            failureCount: failureCount,
          });

          if (failureCount > 0) {
            const errorSheet = workbook.addWorksheet("Errors");
            errorSheet.columns = [
              { header: "School ID", key: "schoolId", width: 20 },
              { header: "Error Message", key: "message", width: 50 },
            ];

            errorMessages.forEach(({ schoolId, message }) => {
              errorSheet.addRow({ schoolId, message });
            });
          }

          const excelBuffer = await workbook.xlsx.writeBuffer();
          const uniqueFilename = `School-Success-Error-Log-${userId.toString()}--${Date.now()}`;
          const logUrl = await uploadToStorage(
            excelBuffer,
            uniqueFilename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );

          await AuditLog.create({
            eventType: "Schools Import",
            status: "success",
            logUrl,
            userId,
            name:userName
          });

          parentPort.postMessage({
            success: true,
            message: "Bulk upload initiated successfully and processing",
          });
        } catch (creationError) {
          parentPort.postMessage({
            success: false,
            message: "Bulk upload failed during school creation",
            error: creationError.message,
          });
        }
      } else {
        parentPort.postMessage({
          success: false,
          message: "No valid school data available for processing",
        });
      }
    } catch (err) {
      parentPort.postMessage({ success: false, error: err });
    } finally {
      session.endSession();
      await client.close();
    }
  });
});

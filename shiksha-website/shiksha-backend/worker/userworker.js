const { workerData, parentPort } = require("worker_threads");
const ExcelJS = require("exceljs");
const { sendWelcomeSMS } = require("../helper/worker.helper");
const User = require("../models/user.model");
const School = require("../models/school.model");
const dbService = require("../config/db.js");
const { bulkUploadSchema } = require("../validations/user.validation");
const { uploadToStorage } = require("../services/azure.blob.service");
const AuditLog = require("../models/audit.log.model");

async function processRow(
  userDataRow,
  rowNumber,
  phoneNumbers,
  validationErrors,
  userData
) {
  const { error } = bulkUploadSchema.validate(userDataRow);
  if (error) {
    validationErrors.push({ row: rowNumber, message: error.message });
    return;
  }

  if (phoneNumbers.has(userDataRow.phone)) {
    validationErrors.push({
      row: rowNumber,
      message: `Duplicate phone number ${userDataRow.phone} found within the file`,
    });
    return;
  }

  phoneNumbers.add(userDataRow.phone);

  const existingUser = await User.findOne({ phone: userDataRow.phone });
  if (existingUser) {
    validationErrors.push({
      row: rowNumber,
      message: `Phone number ${userDataRow.phone} already exists`,
    });
    return;
  }

  const existingSchool = await School.findOne({ schoolId: userDataRow.school });
  if (!existingSchool) {
    validationErrors.push({
      row: rowNumber,
      message: `School with diseCode ${userDataRow.school} does not exist`,
    });
    return;
  }

  userDataRow.school = existingSchool._id.toString();
  userDataRow.state = existingSchool.state;
  userDataRow.zone = existingSchool.zone;
  userDataRow.district = existingSchool.district;
  userDataRow.block = existingSchool.block;

  userData.push(userDataRow);
}

async function handleValidationErrors(validationErrors, userId ,userName) {
  if (validationErrors.length === 0) {
    return { errorFileBuffer: null, errorUrl: "" };
  }

  const errorWorkbook = new ExcelJS.Workbook();
  const errorSheet = errorWorkbook.addWorksheet("Validation Errors");
  const uniqueFilename = `Teacher-Error-Log-${userId}-${Date.now()}`;
  errorSheet.columns = [
    { header: "Row Number", key: "row", width: 15 },
    { header: "Error Message", key: "message", width: 50 },
  ];

  validationErrors.forEach((error) => errorSheet.addRow(error));

  const errorFileBuffer = await errorWorkbook.xlsx.writeBuffer();
  const errorUrl = await uploadToStorage(
    errorFileBuffer,
    uniqueFilename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  await AuditLog.create({
    eventType: "Teachers Import",
    status: "failure",
    logUrl: errorUrl,
    userId,
    name:userName
  });

  return { errorFileBuffer, errorUrl };
}

async function processValidData(userData, client ,userId ,userName) {
  try {
    const totalRecords = userData.length;
    let successCount = 0;
    let failureCount = 0;
    if (userData.length > 0) {
      let insertResult = await User.insertMany(userData);
      successCount = insertResult.length;
      failureCount = totalRecords - successCount;

      await Promise.all(
        userData.map((user) =>
          sendWelcomeSMS(user.phone, user.name).catch((error) => {
            console.error("Error sending welcome SMS:", error);
          })
        )
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Upload Summary');
      
      worksheet.columns = [
        { header: 'Total Records', key: 'totalRecords', width: 20 },
        { header: 'Success Count', key: 'successCount', width: 20 },
        { header: 'Failure Count', key: 'failureCount', width: 20 },
      ];
      
      worksheet.addRow({
        totalRecords: totalRecords,
        successCount: successCount,
        failureCount: failureCount,
      });

      const fileBuffer = await workbook.xlsx.writeBuffer();

      const uniqueFilename = `Bulk-Upload-Summary-${userId}-${Date.now()}.xlsx`;
      const uploadUrl = await uploadToStorage(fileBuffer, uniqueFilename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await AuditLog.create({
        eventType: "Teachers Import",
        status: "success",
        logUrl: uploadUrl,
        userId,
        name:userName
      });

      parentPort.postMessage({
        success: true,
        message: "Bulk upload initiated successfully and in progress!",
      });
    } else {
      parentPort.postMessage({
        success: false,
        message: "No data to process.",
      });
    }
  } catch (error) {
    console.error("Error in background processing:", error);
    parentPort.postMessage({
      success: false,
      message: "Failed to process user data.",
      error: error.message,
    });
  } finally {
    await client.close();
  }
}

dbService.getConnection().then(async (client) => {
  try {
    const worksheet = workerData.worksheetData;
    const userData = [];
    const validationErrors = [];
    const phoneNumbers = new Set();

    const rowProcessingPromises = [];
    worksheet.forEach((rowData, rowNumber) => {
      const isEmptyRow = Object.values(rowData).every(
        (cell) => cell === null || cell === undefined || cell === ""
      );
      if (isEmptyRow) return;

      const userDataRow = {
        name: rowData.name,
        phone: rowData.phone,
        school: Number(rowData.school),
        role: rowData.role,
      };
      rowProcessingPromises.push(
        processRow(userDataRow, rowNumber + 1, phoneNumbers, validationErrors, userData)
      );
    });

    await Promise.all(rowProcessingPromises);
      await handleValidationErrors(
      validationErrors,
      workerData.userId,
      workerData.userName
    );

    await processValidData(userData, client, workerData.userId , workerData.userName);
  } catch (error) {
    console.error("Error processing data in worker:", error);
    parentPort.postMessage({
      success: false,
      message: error.message,
    });
  }
});

const { parentPort } = require("worker_threads");
const ExcelJS = require("exceljs");
const dbService = require("../config/db.js");
const { uploadToStorage } = require("../services/azure.blob.service");
const AuditLog = require("../models/audit.log.model");

dbService.getConnection().then(async (client) => {
  parentPort.on("message", async (data) => {
    try {
      const { users, userId, userName } = data;
      const userWorkBook = new ExcelJS.Workbook();
      const userWorkSheet = userWorkBook.addWorksheet("Users");
      const uniqueFilename = `Teacher-Export-${userId.toString()}--${Date.now()}`;

      userWorkSheet.columns = [
        { header: "Teacher Name", key: "teacherName", width: 30 },
        { header: "School Name", key: "schoolName", width: 30 },
        { header: "Phone Number", key: "phoneNumber", width: 15 },
        { header: "Type of Teacher", key: "teacherType", width: 15 },
        { header: "Status of Teacher", key: "teacherStatus", width: 15 },
      ];

      users.forEach((ele) => {
        userWorkSheet.addRow({
          teacherName: ele.name,
          schoolName: ele.school.name,
          phoneNumber: ele.phone,
          teacherType: ele.role[0],
          teacherStatus: ele.isDeleted ? "Inactive" : "Active",
        });
      });

      const headerRow = userWorkSheet.getRow(1);
      headerRow.height = 20;

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF46A0F1" },
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
          size: 12,
        };
      });

      try {
        const exportUserFileBuffer = await userWorkBook.xlsx.writeBuffer();
        const userFileUrl = await uploadToStorage(
          exportUserFileBuffer,
          uniqueFilename,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        await AuditLog.create({
          eventType: "Teachers Export",
          status: "success",
          logUrl: userFileUrl,
          userId,
          name: userName,
        });

        parentPort.postMessage({
          success: true,
          message: "Teacher Export completed",
          userFileUrl,
        });
      } catch (e) {
        await AuditLog.create({
          eventType: "Teachers Export",
          status: "failure",
          logUrl: null,
          userId: data.userId,
          name: data.userName,
        });

        parentPort.postMessage({
          success: false,
          message: "Failed to export teacher.",
          error: uploadError.message,
        });
      }
    } catch (e) {
      await AuditLog.create({
        eventType: "Teachers Export",
        status: "failure",
        logUrl: null,
        userId: data.userId,
        name: data.userName,
      });
      parentPort.postMessage({ success: false, error: e });
    } finally {
      await client.close();
    }
  });
});

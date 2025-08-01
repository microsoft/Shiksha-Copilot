const { parentPort } = require("worker_threads");
const ExcelJS = require("exceljs");
const dbService = require("../config/db.js");
const { uploadToStorage } = require("../services/azure.blob.service");
const AuditLog = require("../models/audit.log.model");

dbService.getConnection().then(async (client) => {
  parentPort.on("message", async (data) => {
    try {
      const { schools, userId, userName } = data;
      const schoolWorkbook = new ExcelJS.Workbook();
      const schoolWorksheet = schoolWorkbook.addWorksheet("Schools");

      const uniqueFilename = `School-Export-${userId.toString()}--${Date.now()}`;
      schoolWorksheet.columns = [
        { header: "DISE Code", key: "diseCode", width: 15 },
        { header: "School Name", key: "schoolName", width: 45 },
        { header: "State", key: "state", width: 20 },
        { header: "Zone", key: "zone", width: 20 },
        { header: "District", key: "district", width: 20 },
        { header: "Taluk", key: "taluk", width: 20 },
        { header: "Status", key: "status", width: 20 },
      ];

      if (schools.length) {
        schools.forEach((ele) => {
          schoolWorksheet.addRow({
            diseCode: ele.schoolId,
            schoolName: ele.name,
            state: ele.state,
            zone: ele.zone,
            district: ele.district,
            taluk: ele.block,
            status: ele.isDeleted ? "Inactive" : "Active",
          });
        });
      }

      const headerRow = schoolWorksheet.getRow(1);
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
        const schoolFileBuffer = await schoolWorkbook.xlsx.writeBuffer();

        const schoolFileUrl = await uploadToStorage(
          schoolFileBuffer,
          uniqueFilename,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        await AuditLog.create({
          eventType: "Schools Export",
          status: "success",
          logUrl: schoolFileUrl,
          userId,
          name: userName,
        });
        parentPort.postMessage({
          success: true,
          message: "Export completed",
          schoolFileUrl,
        });
      } catch (uploadError) {
        await AuditLog.create({
          eventType: "Schools Export",
          status: "failure",
          logUrl: null,
          userId: data.userId,
          name: data.userName,
        });
        parentPort.postMessage({
          success: false,
          message: "Failed to export school.",
          error: uploadError.message,
        });
      }
    } catch (err) {
      await AuditLog.create({
        eventType: "Schools Export",
        status: "failure",
        logUrl: null,
        userId: data.userId,
        name: data.userName,
      });
      parentPort.postMessage({ success: false, error: err });
    } finally {
      await client.close();
    }
  });
});

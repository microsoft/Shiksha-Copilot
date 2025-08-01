const { parentPort } = require("worker_threads");
const ExcelJS = require("exceljs");
const dbService = require("../config/db.js");
const { uploadToStorage } = require("../services/e2e.storage.service");
const AuditLog = require("../models/audit.log.model");

dbService.getConnection().then(async (client) => {
  parentPort.on("message", async (data) => {
    try {
      const { contentActivities, userId, userName } = data;
      const contentActivityWorkBook = new ExcelJS.Workbook();
      const contentActivityWorkSheet = contentActivityWorkBook.addWorksheet("ContentActivity");
      const uniqueFilename = `Content-Activity-Export-${userId.toString()}--${Date.now()}`;

      contentActivityWorkSheet.columns = [
        { header: "Teacher Name", key: "userName", width: 30 },
        { header: "Content generated", key: "genContent", width: 50 },
        { header:"Generated Date", key:"createdAt",width:30},
        { header: "Status", key: "teacherLessonPlanStatus", width: 15 },
      ];

      contentActivities.forEach((ele) => {
        contentActivityWorkSheet.addRow({
          userName: ele.userName,
          genContent: ele.genContent,
          createdAt:ele.createdAt,
          teacherLessonPlanStatus: ele.teacherLessonPlanStatus,
        });
      });

      const headerRow = contentActivityWorkSheet.getRow(1);
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
        const exportContentActivityFileBuffer = await contentActivityWorkBook.xlsx.writeBuffer();
        const contentActivityFileUrl = await uploadToStorage(
            exportContentActivityFileBuffer,
          uniqueFilename,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        await AuditLog.create({
          eventType: "Content Activity Export",
          status: "success",
          logUrl: contentActivityFileUrl,
          userId,
          name: userName,
        });

        parentPort.postMessage({
          success: true,
          message: "Content Activity Export completed",
          contentActivityFileUrl,
        });
      } catch (e) {
        await AuditLog.create({
          eventType: "Content Activity Export",
          status: "failure",
          logUrl: null,
          userId: data.userId,
          name: data.userName,
        });

        parentPort.postMessage({
          success: false,
          message: "Failed to export content activity.",
          error: uploadError.message,
        });
      }
    } catch (e) {
      await AuditLog.create({
        eventType: "Content Activity Export",
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

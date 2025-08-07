const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const AuditLogController = require("../controllers/audit.log.controller.js");
const auditLogController  = new AuditLogController();

router.get(
    "/audit/log",
    asyncMiddleware(auditLogController.getAll.bind(auditLogController)
));

module.exports = router;

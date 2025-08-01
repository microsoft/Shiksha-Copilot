const AuditLogManager = require("../managers/audit.log.manager.js");
const BaseController = require("./base.controller.js");

class AuditLogController extends BaseController {
    constructor() {
        super(new AuditLogManager());
        this.auditLogManager = new AuditLogManager();
    }

}

module.exports = AuditLogController;

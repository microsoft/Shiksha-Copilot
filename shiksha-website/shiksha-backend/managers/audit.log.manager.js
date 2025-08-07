const AuditLogDao = require("../dao/audit.log.dao");
const BaseManager = require("./base.manager");

class AuditLogManager extends BaseManager {
	constructor() {
		super(new AuditLogDao());
	}
}

module.exports = AuditLogManager;
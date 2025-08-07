const AuditLog = require("../models/audit.log.model");
const BaseDao = require("./base.dao.js");

class AuditLogDao extends BaseDao {
	constructor() {
		super(AuditLog);
	}
}

module.exports = AuditLogDao;
const BaseDao = require('./base.dao');
const FLNResource = require('../models/fln.resource.model');

class FLNResourceDao extends BaseDao {
  constructor() {
    super(FLNResource);
  }

  // Add any FLN-specific DAO methods here if needed
}

module.exports = FLNResourceDao; 
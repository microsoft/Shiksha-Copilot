const BaseManager = require("./base.manager");
const MasterClassDao = require("../dao/master.class.dao");
const formatApiReponse = require("../helper/response");

class MasterClassManager extends BaseManager {
  constructor() {
    super(new MasterClassDao());
    this.masterClassDao = new MasterClassDao();
  }

  async updateClass(id, updates) {
    try {
      const updatedClass = await this.masterClassDao.update(id, updates);
      if (!updatedClass) {
        return formatApiReponse(false, "Class not found", null);
      }
      return formatApiReponse(true, "", updatedClass);
    } catch (err) {
      return formatApiReponse(false, err?.message, err);
    }
  }
}

module.exports = MasterClassManager;
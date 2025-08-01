
const MasterClassManager = require("../managers/master.class.manager.js");
const BaseController = require("./base.controller.js");

class MasterClassController extends BaseController {
  constructor() {
    super(new MasterClassManager());
    this.masterClassManager = new MasterClassManager();
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await this.masterClassManager.updateClass(id, req.body);
      if (!result.success) {
        return res.status(404).json({ message: result.message });
      }
      return res.status(200).json(result.data);
    } catch (err) {
      console.log("Error --> MasterClassController -> update()", err);
      return res.status(400).json(err);
    }
  }
}

module.exports = MasterClassController;
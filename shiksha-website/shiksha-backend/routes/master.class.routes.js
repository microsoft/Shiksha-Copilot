const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const MasterClassController = require("../controllers/master.class.controller.js");
const { validateMasterClass } = require("../validations/master.class.validation.js");

const masterClassController = new MasterClassController();

router.post(
  "/master-class/create",
  validateMasterClass,
  asyncMiddleware(masterClassController.create.bind(masterClassController))
);

router.get(
  "/master-class/list",
  asyncMiddleware(masterClassController.getAll.bind(masterClassController))
);

router.get(
  "/master-class/:id",
  asyncMiddleware(masterClassController.getById.bind(masterClassController))
);

router.put(
  "/master-class/update",
  validateMasterClass,
  asyncMiddleware(masterClassController.update.bind(masterClassController))
);

router.delete(
  "/master-class/:id",
  asyncMiddleware(masterClassController.delete.bind(masterClassController))
);

module.exports = router;
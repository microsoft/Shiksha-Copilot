const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const RegionController = require("../controllers/region.controller.js");

const regionController = new RegionController();

router.get(
	"/regions/list",
	asyncMiddleware(regionController.getAll.bind(regionController))
);

module.exports = router;

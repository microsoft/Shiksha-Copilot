const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const RegionController = require("../controllers/region.controller.js");

const regionController = new RegionController();

router.get(
	"/regions/list",
	asyncMiddleware(regionController.getAll.bind(regionController))
);

// Get all states
router.get(
	"/regions/states",
	asyncMiddleware(regionController.getStates.bind(regionController))
);

// Get zones for a state
router.get(
	"/regions/zones",
	asyncMiddleware(regionController.getZones.bind(regionController))
);

// Get districts for a zone
router.get(
	"/regions/districts",
	asyncMiddleware(regionController.getDistricts.bind(regionController))
);

// Get taluks for a district
router.get(
	"/regions/taluks",
	asyncMiddleware(regionController.getTaluks.bind(regionController))
);

// Get schools for a taluk
router.get(
	"/regions/schools",
	asyncMiddleware(regionController.getSchools.bind(regionController))
);

module.exports = router;

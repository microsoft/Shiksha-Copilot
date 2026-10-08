const RegionManager = require("../managers/region.manager");
const BaseController = require("./base.controller");

class RegionController extends BaseController {
	constructor() {
		super(new RegionManager());
	}

	/**
	 * Get all states
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 */
	async getStates(req, res) {
		const states = await this.manager.getStates();
		res.json({
			success: true,
			data: states
		});
	}

	/**
	 * Get zones for a state
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 */
	async getZones(req, res) {
		const { state } = req.query;
		if (!state) {
			return res.status(400).json({
				success: false,
				message: "State parameter is required"
			});
		}
		const zones = await this.manager.getZones(state);
		res.json({
			success: true,
			data: zones
		});
	}

	/**
	 * Get districts for a zone
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 */
	async getDistricts(req, res) {
		const { zone } = req.query;
		if (!zone) {
			return res.status(400).json({
				success: false,
				message: "Zone parameter is required"
			});
		}
		const districts = await this.manager.getDistricts(zone);
		res.json({
			success: true,
			data: districts
		});
	}

	/**
	 * Get taluks for a district
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 */
	async getTaluks(req, res) {
		const { district } = req.query;
		if (!district) {
			return res.status(400).json({
				success: false,
				message: "District parameter is required"
			});
		}
		const taluks = await this.manager.getTaluks(district);
		res.json({
			success: true,
			data: taluks
		});
	}

	/**
	 * Get schools for a taluk
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 */
	async getSchools(req, res) {
		const { taluk } = req.query;
		if (!taluk) {
			return res.status(400).json({
				success: false,
				message: "Taluk parameter is required"
			});
		}
		const schools = await this.manager.getSchools(taluk);
		res.json({
			success: true,
			data: schools
		});
	}
}

module.exports = RegionController;

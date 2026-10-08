const RegionDao = require("../dao/region.dao");
const BaseManager = require("./base.manager");
const SchoolDao = require("../dao/school.dao");

class RegionManager extends BaseManager {
	constructor() {
		super(new RegionDao());
		this.schoolDao = new SchoolDao();
	}

	/**
	 * Get all states
	 * @returns {Promise<Array>} Array of states
	 */
	async getStates() {
		const regions = await this.dao.getAll();
		const states = [...new Set(regions.map(region => region.state))];
		return states;
	}

	/**
	 * Get zones for a state
	 * @param {string} state - State name
	 * @returns {Promise<Array>} Array of zones
	 */
	async getZones(state) {
		const regions = await this.dao.getAll();
		const stateRegion = regions.find(region => region.state === state);
		if (!stateRegion) {
			return [];
		}
		return stateRegion.zones || [];
	}

	/**
	 * Get districts for a zone
	 * @param {string} zone - Zone name
	 * @returns {Promise<Array>} Array of districts
	 */
	async getDistricts(zone) {
		const regions = await this.dao.getAll();
		for (const region of regions) {
			const zoneData = region.zones.find(z => z.name === zone);
			if (zoneData) {
				return [zoneData.districts];
			}
		}
		return [];
	}

	/**
	 * Get taluks for a district
	 * @param {string} district - District name
	 * @returns {Promise<Array>} Array of taluks
	 */
	async getTaluks(district) {
		const regions = await this.dao.getAll();
		for (const region of regions) {
			for (const zone of region.zones) {
				if (zone.districts.name === district) {
					return zone.districts.blocks || [];
				}
			}
		}
		return [];
	}

	/**
	 * Get schools for a taluk
	 * @param {string} taluk - Taluk name
	 * @returns {Promise<Array>} Array of schools
	 */
	async getSchools(taluk) {
		const schools = await this.schoolDao.getAll();
		return schools.filter(school => school.block === taluk);
	}
}

module.exports = RegionManager;

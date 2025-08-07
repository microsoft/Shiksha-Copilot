const handleError = require("../helper/handleError.js");
const MasterResourceManager = require("../managers/master.resource.manager.js");
const BaseController = require("./base.controller.js");

class MasterResourceController extends BaseController {
	constructor() {
		super(new MasterResourceManager());
		this.masterResourceManager = new MasterResourceManager();
	}

	async update(req, res) {
		try {
			const { id } = req.params;
			const result = await this.masterResourceManager.updateMasterResource(
				id,
				req.body
			);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result.data);
		} catch (err) {
			console.log("Error --> MasterResourceController -> update()", err);
			return res.status(400).json(err);
		}
	}

	async regenerate(req, res) {
		try {
			const rolesAccessible = ["power", "admin", "manager"];
			if (!rolesAccessible.includes(req.user.role)) {
				return res.status(403).json({
					message:
						"Forbidden: You do not have the required permissions to perform this action.",
				});
			}
			const { resourceId, reason, userId } = req.body;
			const result = await this.masterResourceManager.regenerateResourcePlan({
				resourceId,
				reason,
				userId,
			});
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result.data);
		} catch (err) {
			console.log("Error --> MasterResourceController -> regenerate()", err);
			return res.status(400).json(err);
		}
	}

	async comboScript(req, res) {
		try {
			const { board = "CBSE", medium = "English" } = req.body;
			const result = await this.masterResourceManager.comboScript(
				board,
				medium
			);
			if (result.success) {
				return res.status(200).json(result.data);
			}
			handleError(result, res);
			return;
		} catch (err) {
			console.log("Error --> MasterResourceController -> comboScript()", err);
			return res.status(400).json(err);
		}
	}

	async getSubtopicResourceList(req, res) {
		try {
			const { chapterId } = req.params;
			const result = await this.masterResourceManager.getSubtopicResourceList(
				chapterId
			);
			if (result) {
				return res.status(200).json(result);
			}
			handleError(result, res);
			return;
		} catch (err) {
			console.log(
				"Error --> MasterResourceController -> getSubtopicResourceList()",
				err
			);
			return res.status(400).json(err);
		}
	}

	async generateResourcePlan(req, res) {
		try {
			const { resourceId } = req.params;
			const { _id: teacherId } = req.user;
			const { filters = {} } = req.query;

			const result = await this.masterResourceManager.generateResourcePlan(
				teacherId,
				resourceId,
				filters
			);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);
			return;
		} catch (err) {
			console.log(
				"Error --> MasterResourceController -> generateResourcePlan()",
				err
			);
			return res.status(400).json(err);
		}
	}
}

module.exports = MasterResourceController;

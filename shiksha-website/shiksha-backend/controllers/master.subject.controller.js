const MasterSubjectManager = require("../managers/master.subject.manager.js");
const BaseController = require("./base.controller.js");

class MasterSubjectController extends BaseController {
	constructor() {
		super(new MasterSubjectManager());
		this.masterSubjectManager = new MasterSubjectManager();
	}

	async getByName(req, res) {
		try {
			const { subject } = req.body;
			const user = req.user;

			const result = await this.masterSubjectManager.getByName(subject, user);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result);
		} catch (err) {
			console.log("Error --> MasterSubjectController -> getByNames()", err);
			return res.status(400).json(err);
		}
	}

	async getByBoard(req, res) {
		try {
			const { board } = req.params;

			const result = await this.masterSubjectManager.getByBoard(board);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result);
		} catch (err) {
			console.log("Error --> MasterSubjectController -> getByNames()", err);
			return res.status(400).json(err);
		}
	}

	async update(req, res) {
		try {
			const { id } = req.params;
			const result = await this.masterSubjectManager.updateSubject(
				id,
				req.body
			);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result);
		} catch (err) {
			console.log("Error --> MasterSubjectController -> update()", err);
			return res.status(400).json(err);
		}
	}
}

module.exports = MasterSubjectController;

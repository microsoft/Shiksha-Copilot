const handleError = require("../helper/handleError.js");
const ClassManager = require("../managers/school.class.manager.js");
const BaseController = require("./base.controller.js");

class ClassController extends BaseController {
	constructor() {
		super(new ClassManager());
		this.classManager = new ClassManager();
	}

	async getGroupClassesByBoard(req, res) {
		try {
			let { schoolId } = req.params;

			let result = await this.classManager.getGroupClassesByBoard(schoolId);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> getGroupClassesByBoard()", err);
			return res.status(400).json(err);
		}
	}

	async update(req, res) {
		try {
			const { id } = req.params;
			const result = await this.classManager.updateClass(id, req.body);
			if (!result.success) {
				return res.status(404).json({ message: result.message });
			}
			return res.status(200).json(result.data);
		} catch (err) {
			console.log("Error --> ClassController -> update()", err);
			return res.status(400).json(err);
		}
	}
}

module.exports = ClassController;

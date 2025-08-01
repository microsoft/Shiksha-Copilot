const ChapterManager = require("../managers/chapter.manager");
const BaseController = require("./base.controller");
const handleError = require("../helper/handleError")

class ChapterController extends BaseController {
	constructor() {
		super(new ChapterManager());
		this.chapterManager = new ChapterManager();
	}

	async getBySemester(req, res){
		try {
			const {
				filter = {},
			} = req.query;

			const transformedFilter = { ...filter };
			const result = await this.chapterManager.getBySemester(transformedFilter);
			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> getAll()", err);
			return res.status(400).json(err);
		}
	}

	async scriptFromLp(req, res) {
		try {
			let result = await this.chapterManager.scriptFromLp(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> BaseController -> scriptFromLp()", err);
			return res.status(400).json(err);
		}
	}


	async updateChapter(req, res) {
		try {
			let result = await this.chapterManager.updateChapter(req);

			if (result.success) {
				return res.status(200).json(result);
			}

			handleError(result, res);

			return;
		} catch (err) {
			console.log("Error --> ChapterController -> updateChapter()", err);
			return res.status(400).json(err);
		}
	}



}

module.exports = ChapterController;

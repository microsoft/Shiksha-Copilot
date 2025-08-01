const BaseManager = require("./base.manager");
const MasterSubjectDao = require("../dao/master.subject.dao");
const formatApiReponse = require("../helper/response");
const SchoolDao = require("../dao/school.dao");
const BoardDao = require("../dao/board.dao");

class MasterSubjectManager extends BaseManager {
	constructor() {
		super(new MasterSubjectDao());
		this.masterSubjectDao = new MasterSubjectDao();
		this.schoolDao = new SchoolDao();
		this.boardDao = new BoardDao();
	}

	async getByName(subjectName, user) {
		try {
			const school = await this.schoolDao.getById(user.school);

			if (!school) {
				return formatApiReponse(false, "Invalid school for teacher", null);
			}

			let board = await this.boardDao.getByAbbreviation(school.board);

			if (!board) {
				return formatApiReponse(false, "Invalid board for school", null);
			}

			const subject = await this.masterSubjectDao.getByNameAndBoard(
				subjectName,
				board
			);
			if (!subject) {
				return formatApiReponse(false, "Subject not found", null);
			}
			return formatApiReponse(true, "", subject);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async getByBoard(boardName) {
		try {
			let masterSubjects = await this.masterSubjectDao.filter({
				boards: boardName,
			});

			return formatApiReponse(true, "", masterSubjects);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}

	async updateSubject(id, updates) {
		try {
			const updatedSubject = await this.masterSubjectDao.update(id, updates);
			if (!updatedSubject) {
				return formatApiReponse(false, "Subject not found", null);
			}
			return formatApiReponse(true, "", updatedSubject);
		} catch (err) {
			return formatApiReponse(false, err?.message, err);
		}
	}
}

module.exports = MasterSubjectManager;

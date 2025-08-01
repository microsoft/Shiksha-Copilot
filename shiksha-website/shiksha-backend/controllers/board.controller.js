const handleError = require("../helper/handleError.js");
const BoardManager = require("../managers/board.manager.js");
const BaseController = require("./base.controller.js");

class BoardController extends BaseController {
    constructor() {
        super(new BoardManager());
        this.boardManager = new BoardManager();
    }

    async getByName(req, res) {
        try {
            let result = await this.boardManager.getByName(req);
            if (result.success) {
                return res.status(200).json(result);
            }

            handleError(result, res);

            return;
        } catch (err) {
            console.log("Error --> BoardController -> getByType()", err);
            return res.status(400).json(err);
        }
    }

    async update(req, res) {
        try {
            let result = await this.boardManager.update(req);

            if (result.success) {
                return res.status(200).json(result);
            }

            handleError(result, res);

            return;
        } catch (err) {
            console.log("Error --> BoardController -> update()", err);
            return res.status(400).json(err);
        }
    }
}

module.exports = BoardController;

const express = require("express");
const router = express.Router();
const asyncMiddleware = require("../middlewares/asyncMiddleware.js");
const BoardController = require("../controllers/board.controller.js");
const {
    validateBoardCreate,
    validateBoardUpdate,
} = require("../validations/board.validation.js");

const boardController = new BoardController();

router.post(
    "/board/create",
    validateBoardCreate,
    asyncMiddleware(boardController.create.bind(boardController))
);

router.get(
    "/board/list",
    asyncMiddleware(boardController.getAll.bind(boardController))
);

router.get(
    "/board/:id",
    asyncMiddleware(boardController.getById.bind(boardController))
);

router.put(
    "/board/update",
    validateBoardUpdate,
    asyncMiddleware(boardController.update.bind(boardController))
);

router.delete(
    "/board/:id",
    asyncMiddleware(boardController.delete.bind(boardController))
);

module.exports = router;

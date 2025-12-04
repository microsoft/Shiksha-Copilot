const HelpVideosManager = require("../managers/help.vidoes.manager.js");
const HelpVideos = require("../models/help.videos.model.js");
const BaseController = require("./base.controller.js");

class HelpVideosController extends BaseController {
  constructor() {
    super(new HelpVideosManager());
  }

  async getAllHelpVideos(req, res) {
    try {
      const { state } = req.query;

      const query = {};
      if (state) {
        query.state = state;
      }

      const helpVideos = await HelpVideos.find(query).sort({ createdAt: -1 });

      res.json({success:true, data:helpVideos});
    } catch (error) {
      console.error("Error fetching help videos:", error);
      res.status(500).json({
        message: "Error fetching help videos",
        error: error.message,
      });
    }
  }

  async bulkUploadHelpVideos(req, res) {
    try {
      const videos = req.body;

      if (!Array.isArray(videos) || videos.length === 0) {
        return res.status(400).json({
          message: "Request body must be a non-empty array of videos",
        });
      }

      const insertedVideos = await HelpVideos.insertMany(videos);

      res.status(201).json({
        message: "Help videos uploaded successfully",
        data: insertedVideos,
      });
    } catch (error) {
      console.error("Error bulk uploading help videos:", error);
      res.status(500).json({
        message: "Error bulk uploading help videos",
        error: error.message,
      });
    }
  }
}

module.exports = HelpVideosController;

const mongoose = require("mongoose");

const helpVideosSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true
        },
        link: {
            type: String,
        },
        state: {
            type: String,
        }
    },
    { timestamps: true }
);

const HelpVideos = mongoose.model("HelpVideos", helpVideosSchema);

module.exports = HelpVideos;

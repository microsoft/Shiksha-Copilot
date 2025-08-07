
const MasterLesson = require("../models/master.lesson.model");
const TeacherLessonPlan = require("../models/teacher.lesson.plan.model")
const User = require("../models/user.model");
const Chapter = require("../models/chapter.model");
const LessonFeedback = require("../models/feedback.lesson.model")

async function runMigrations() {
    try {
        await MasterLesson.updateMany(
            { isRegenerated: { $exists: false } },
            { $set: { isRegenerated: false } }
        )
        await TeacherLessonPlan.updateMany(
            { isVideoSelected: { $exists: false } },
            { $set: { isVideoSelected: false } }
        );
        await Chapter.updateMany(
            { orderNumber: { $type: "string" } },
            [
                { 
                    $set: { orderNumber: { $toInt: "$orderNumber" } }}
            ]
        
        );

        console.log("Migrations completed successfully.");
    } catch (err) {
        console.error("Error running migrations:", err);
        throw err;
    }
}

module.exports = runMigrations;


const MasterLesson = require("../models/master.lesson.model");
const MasterResource = require("../models/master.resource.model");
const TeacherLessonPlan = require("../models/teacher.lesson.plan.model")
const User = require("../models/user.model");
const Chapter = require("../models/chapter.model");
const LessonFeedback = require("../models/feedback.lesson.model")
const LessonPlanTemplate = require("../models/lesson.plan.template.model");
const LessonChat = require("../models/lesson.chats.model");
const MasterSubjects = require('../models/master.subject.model')
const Schedule = require("../models/schedule.model");
const QuestionBankConfiguration = require("../models/question.bank.config.model")
const Classes = require("../models/school.class.model")
const Chapters = require("../models/chapter.model")
const Schools = require("../models/school.model")

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

//         // --------------------TEMPLETE ID MIGRATION TOTAL - 7-------------------------------

// //Migration to add template id for science mathematics and evs CHAPTER lmaster esson plan
// const updateInfosmc = await MasterLesson.updateMany(
//     {
//       board: "KSEEB",
//       medium: { $in: ["english", "kannada"] },
//       subject: {
//         $in: ["science_1", "science_2", "mathematics_1", "mathematics_2","evs_1","evs_2"],
//       },
//       isAll: true,
//     },
//     {
//       $set: {
//         templateId: "687617f70736728e04ba6e27",
//       },
//     }
//   );
  
//   console.log(
//     "template Id migration for science maths and evs CHAPTER master lesson complete"
//   );
//   console.log("updateInfo", updateInfosmc);
  
//   //Migration to add template id for science mathematics and evs SUBTOPIC master lesson plan
//   const updateInfosms = await MasterLesson.updateMany(
//     {
//       board: "KSEEB",
//       medium: { $in: ["english", "kannada"] },
//       subject: {
//         $in: ["science_1", "science_2", "mathematics_1", "mathematics_2","evs_1","evs_2"],
//       },
//       isAll: false,
//     },
//     {
//       $set: {
//         templateId: "687618210736728e04ba6e30",
//       },
//     }
//   );
  
//   console.log(
//     "template Id migration for science maths and evs SUBTOPIC master lesson complete"
//   );
//   console.log("updateInfo", updateInfosms);
  
//   //Migration to add template id for social CHAPTER master lesson plan
//   const updateInfosc = await MasterLesson.updateMany(
//     {
//       board: "KSEEB",
//       medium: { $in: ["english", "kannada"] },
//       subject: {
//         $in: ["social_science_1", "social_science_2"],
//       },
//       isAll: true,
//     },
//     {
//       $set: {
//         templateId: "687618340736728e04ba6e39",
//       },
//     }
//   );
  
//   console.log("template Id migration for social CHAPTER master lesson complete");
//   console.log("updateInfo", updateInfosc);
  
//   //Migration to add template id for social SUBTOPIC master lesson plan
//   const updateInfoss = await MasterLesson.updateMany(
//     {
//       board: "KSEEB",
//       medium: { $in: ["english", "kannada"] },
//       subject: {
//         $in: ["social_science_1", "social_science_2"],
//       },
//       isAll: false,
//     },
//     {
//       $set: {
//         templateId: "687618440736728e04ba6e42",
//       },
//     }
//   );
  
//   console.log("template Id migration for social SUBTOPIC master lesson complete");
//   console.log("updateInfo", updateInfoss);
  
//   //Migration to add template id for English POEM master lesson plan
//   const updateInfoepo = await MasterLesson.updateMany(
//     {
//       board: "KSEEB",
//       medium: { $in: ["english", "kannada"] },
//       subject: {
//         $in: ["english 2_1", "english 2_2"],
//       },
//       isAll: false,
//       name: { $regex: "POEM", $options: "i" },
//     },
//     {
//       $set: {
//         templateId: "687618520736728e04ba6e4b",
//       },
//     }
//   );
  
//   console.log("template Id migration for English POEM master lesson complete");
//   console.log("updateInfo", updateInfoepo);
  
//   //Migration to add template id for English PROSE master lesson plan
//   const updateInfoepr = await MasterLesson.updateMany(
//     {
//       board: "KSEEB",
//       medium: { $in: ["english", "kannada"] },
//       subject: {
//         $in: ["english 2_1", "english 2_2"],
//       },
//       isAll: false,
//       name: { $regex: "PROSE", $options: "i" },
//     },
//     {
//       $set: {
//         templateId: "687618620736728e04ba6e54",
//       },
//     }
//   );
  
//   console.log("template Id migration for English PROSE master lesson complete");
//   console.log("updateInfo", updateInfoepr);
  
//   //Migration to add template id for master resource
  
//   const resourcePalnUpdateData = await MasterResource.updateMany(
//     { board: "KSEEB" },
//     { $set: { templateId: "687618800736728e04ba6e5d" } }
//   );
  
//   console.log(
//     "template Id migration for master resource complete",
//     resourcePalnUpdateData
//   );
  
  // // -------------------MASTER AND TEACHER LESSON AND RESOURCE DATA STRUCTURE CHANGE------------------
  
  // //Migration to transform master lesson instruction set to sections
  // const masterLessons = await MasterLesson.find({
  //   instructionSet: { $exists: true },
  // });
  // for (const doc of masterLessons) {
  //   const newSections = doc.instructionSet.map((entry) => {
  //     return {
  //       id: entry.type.toLowerCase(),
  //       title: entry.type,
  //       content: entry.info?.[0]?.content?.main || "",
  //       outputFormat: "plain_text",
  //     };
  //   });
  
  //   await MasterLesson.updateOne(
  //     { _id: doc._id },
  //     {
  //       $set: {
  //         sections: newSections,
  //       },
  //       $unset: { instructionSet: "" },
  //     }
  //   );
  // }
  
  // console.log("masterlesson instructionset mapped to section");
  
  // //Migration to transform master resource
  // const sectionMappings = {
  //   questionbank: {
  //     id: "question_bank",
  //     title: "Question Bank",
  //     outputFormat: "json_1",
  //   },
  //   realworldscenarios: {
  //     id: "real_world_scenarios",
  //     title: "Real World Scenarios",
  //     outputFormat: "json_2",
  //   },
  //   activities: {
  //     id: "activities",
  //     title: "Activities",
  //     outputFormat: "json_3",
  //   },
  // };
  
  // const masterResource = await MasterResource.find();
  
  // for (const doc of masterResource) {
  //   const originalResources = doc.resources || [];
  //   const originalAdditionalResources = doc.additionalResources || [];
  
  //   const transformSection = (items = []) =>
  //     items.map((item) => {
  //       const mapping = sectionMappings[item.section] || {
  //         id: item.section,
  //         title: item.section,
  //         outputFormat: "json_default",
  //       };
  
  //       return {
  //         id: mapping.id,
  //         title: mapping.title,
  //         outputFormat: mapping.outputFormat,
  //         content: item.data || [],
  //       };
  //     });
  
  //   const newResources = transformSection(originalResources);
  //   const newAdditionalResources = transformSection(originalAdditionalResources);
  
  //   await MasterResource.updateOne(
  //     { _id: doc._id },
  //     {
  //       $set: {
  //         resources: newResources,
  //         additionalResources: newAdditionalResources,
  //       },
  //     }
  //   );
  // }
  
  // console.log("masterResource resource transformed");
  
  // // Teacher lesson data formate migration
  // const teacherLessons = await TeacherLessonPlan.find({ isLesson: true });
  
  // for (const doc of teacherLessons) {
  //   const newSections = doc.instructionSet.map((entry) => {
  //     return {
  //       id: entry.type.toLowerCase(),
  //       title: entry.type,
  //       content: entry.info?.[0]?.content?.main || "",
  //       outputFormat: entry.type === "Evaluate" ? "json_1" : "plain_text",
  //     };
  //   });
  
  //   await TeacherLessonPlan.updateOne(
  //     { _id: doc._id },
  //     {
  //       $set: {
  //         sections: newSections,
  //       },
  //       $unset: { instructionSet: "" },
  //     }
  //   );
  // }
  
  // console.log("teacherlessonplan lesson transformed");
  
  // //Teacher resource data format migration
  // const teacherResource = await TeacherLessonPlan.find({ isLesson: false });
  
  // for (const doc of teacherResource) {
  //   const originalResources = doc.resources || [];
  //   const originalAdditionalResources = doc.additionalResources || [];
  
  //   const transformSection = (items = []) =>
  //     items.map((item) => {
  //       const mapping = sectionMappings[item.section] || {
  //         id: item.section,
  //         title: item.section,
  //         outputFormat: "json_default",
  //       };
  
  //       return {
  //         id: mapping.id,
  //         title: mapping.title,
  //         outputFormat: mapping.outputFormat,
  //         content: item.data || [],
  //       };
  //     });
  
  //   const newResources = transformSection(originalResources);
  //   const newAdditionalResources = transformSection(originalAdditionalResources);
  
  //   await TeacherLessonPlan.updateOne(
  //     { _id: doc._id },
  //     {
  //       $set: {
  //         resources: newResources,
  //         additionalResources: newAdditionalResources,
  //       },
  //     }
  //   );
  // }
  
  // console.log("teacherlessonplan resource transformed");
  
  // ----------------CHECKLIST MIGRATION FOR MASTER LESSON AND TEACHER LESSON------------------
  
  // Master lesson checklist migration
  // const cursorml = MasterLesson.find({ checkList: { $exists: true } });
  // for await (const doc of cursorml) {
  //   const checklistMap = {};
  
  //   for (const item of doc.checkList) {
  //     const key = item.type.toLowerCase(); // ENGAGE → engage
  //     checklistMap[key] = {
  //       activity: item.activity,
  //       materials: item.materials,
  //     };
  //   }
  
  //   const checklistSection = {
  //     id: "section_checklist",
  //     title: "Checklist",
  //     outputFormat: "json_5E_checklist",
  //     content: checklistMap,
  //   };
  
  //   await MasterLesson.updateOne(
  //     { _id: doc._id },
  //     {
  //       $push: { sections: checklistSection },
  //       $unset: { checkList: "" },
  //     }
  //   );
  
  //   // console.log(`Migrated document with _id: ${doc._id}`);
  // }
  
  // console.log("✅ Master lesson checklist migration completed successfully.");
  
  // Teacher lesson migration
  // const cursortl = TeacherLessonPlan.find({ lessonId: { $exists: true } });
  // for await (const instance of cursortl) {
  //   const lesson = await MasterLesson.findOne({ _id: instance.lessonId });
  //   if (!lesson) {
  //     console.warn(`⚠️ Lesson not found for lessonId: ${instance.lessonId}`);
  //     continue;
  //   }
  //   let checklistContent = null;
  //   if (Array.isArray(lesson.sections)) {
  //     const checklistSection = lesson.sections.find(
  //       (s) => s.id === "section_checklist"
  //     );
  //     if (checklistSection && checklistSection.content) {
  //       checklistContent = checklistSection.content;
  //     }
  //   }
  
  //   if (!checklistContent) {
  //     console.warn(`⚠️ No checklist found for lessonId: ${instance.lessonId}`);
  //     continue;
  //   }
  
  //   const checklistSectionForInstance = {
  //     id: "section_checklist",
  //     title: "Checklist",
  //     outputFormat: "json_5E_checklist",
  //     content: checklistContent,
  //   };
  
  //   await TeacherLessonPlan.updateOne(
  //     { _id: instance._id },
  //     {
  //       $push: { sections: checklistSectionForInstance },
  //     }
  //   );
  
  //   // console.log(`✅ Added checklist to lessonInstance _id: ${instance._id}`);
  // }
  
  // console.log("🎉 Teacher lesson check list migration completed.");

  // const cursor = LessonPlanTemplate.find({ sections: { $exists: true, $ne: [] } }).cursor();

  //   let updatedCount = 0;

  //   for await (const doc of cursor) {
  //     let modified = false;

  //     doc.sections = doc.sections.map(section => {
  //       // Only add mode if it doesn't already exist
  //       if (!section.mode) {
  //         section.mode = 'rag';
  //         modified = true;
  //       }
  //       return section;
  //     });

  //     if (modified) {
  //       await doc.save();
  //       updatedCount++;
  //       console.log(`✅ Updated document with _id: ${doc._id}`);
  //     }
  //   }

  //   console.log(`🎉 Migration complete. Total documents updated: ${updatedCount}`);

// const messages = await LessonChat.find({ "message.version": { $exists: false } });
// for (const msg of messages) {
//   msg.message.version = 1;
//   await msg.save();
// }



  //   const kseebObject = {
  //     board: 'KSEEB',
  //     classes: [5, 6, 7, 8, 9, 10],
  //   };

  //  const cursor = MasterSubjects.find({ boards: 'KSEEB' });

  //   for await (const doc of cursor) {
  //     if (!doc.applicableClasses) {
  //       // Create applicableClasses with KSEEB object
  //       await MasterSubjects.updateOne(
  //         { _id: doc._id },
  //         { $set: { applicableClasses: [kseebObject] } }
  //       );
  //     } else {
  //       // Check if KSEEB object already exists
  //       const hasKseeb = doc.applicableClasses.some(
  //         (ac) => ac.board === 'KSEEB'
  //       );

  //       if (!hasKseeb) {
  //         // Append KSEEB object
  //         await MasterSubjects.updateOne(
  //           { _id: doc._id },
  //           { $push: { applicableClasses: kseebObject } }
  //         );
  //       }
  //     }
  //   }
//     await Schedule.updateMany({board:"SCERT"}, {$set:{board:"BSE-TG"}})
//     await MasterLesson.updateMany({board:"SCERT"}, {$set:{board:"BSE-TG"}})
//     await MasterResource.updateMany({board:"SCERT"}, {$set:{board:"BSE-TG"}})
//     await QuestionBankConfiguration.updateMany({board:"SCERT"}, {$set:{board:"BSE-TG"}})
//     await Classes.updateMany({board:"SCERT"}, {$set:{board:"BSE-TG"}})
//     await Chapters.updateMany({board:"SCERT"}, {$set:{board:"BSE-TG"}})

//    await  LessonPlanTemplate.updateMany(
//   { boards: "SCERT" },
//   { $set: { "boards.$[elem]": "BSE-TG" } },
//   { arrayFilters: [{ elem: "SCERT" }] }
// )
  
//    await  MasterSubjects.updateMany(
//   { boards: "SCERT" },
//   { $set: { "boards.$[elem]": "BSE-TG" } },
//   { arrayFilters: [{ elem: "SCERT" }] }
// )

//    await  Schools.updateMany(
//   { boards: "SCERT" },
//   { $set: { "boards.$[elem]": "BSE-TG" } },
//   { arrayFilters: [{ elem: "SCERT" }] }
// )

// await User.updateMany(
//   { "classes.board": "SCERT" },
//   { $set: { "classes.$[elem].board": "BSE-TG" } },
//   { arrayFilters: [{ "elem.board": "SCERT" }] }
// )

        console.log("Migrations completed successfully.");
    } catch (err) {
        console.error("Error running migrations:", err);
        throw err;
    }
}

module.exports = runMigrations;

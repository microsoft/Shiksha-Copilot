const ChapterDao = require("../dao/chapter.dao");
const MasterSubjectDao = require("../dao/master.subject.dao");
const BaseManager = require("./base.manager");
const {
	subjectRegex,
	boardRegex,
	mediumRegex,
	orderNumberRegex,
	standardRegex,
	titleRegex,
} = require("../helper/data.helper");
const formatApiReponse = require("../helper/response");
const {formatSubject,getSemester} = require('../helper/formatter');
const Chapter = require("../models/chapter.model");

class ChapterManager extends BaseManager {
	constructor() {
		super(new ChapterDao());
		this.chapterDao = new ChapterDao();
		this.masterSubejectDao = new MasterSubjectDao();
	}

	async scriptFromLp(req) {
        try {
            let lessonPlans = req.body;
            let chapterCount=0;
            let subjectCount=0;
            let indexPathCount=0

            if (typeof lessonPlans === 'object' && !Array.isArray(lessonPlans)) {
                lessonPlans = [lessonPlans];
            }
 
            lessonPlans = lessonPlans.filter((lp) => lp.lp_level == "CHAPTER");
 
            for (let i = 0; i < lessonPlans.length; i++) {
                let subjectName = lessonPlans[i].chapter_id.match(subjectRegex)[1];
                let title = lessonPlans[i].chapter_id.match(titleRegex)[1];
                let medium = lessonPlans[i].chapter_id.match(mediumRegex)[1];
                let board = lessonPlans[i].chapter_id.match(boardRegex)[1];
                let standard = lessonPlans[i].chapter_id.match(standardRegex)[1];
                let orderNumber = lessonPlans[i].chapter_id.match(orderNumberRegex)[1];

 
                let subject = await this.masterSubejectDao.getByNameAndBoard(
                    subjectName,
                    board
                );


                if (!subject) {
                    subject = await this.masterSubejectDao.create({
                        subjectName,
                        boards: [board],
                        sem:getSemester(subjectName),
                        name:formatSubject(subjectName)
                    });
                    subjectCount+=1;
                }
 
                let chapter = await this.chapterDao.getOne({
                    board,
                    medium,
                    topics: title,
                    standard: Number(standard),
                    orderNumber: Number(orderNumber),
                });
 
                if (chapter) {
                    if(lessonPlans[i]?.index_path){
                        chapter.indexPath= lessonPlans[i]?.index_path
                        await chapter.save();
                        indexPathCount+=1
                    }
                    continue;
                }
 
                let chapterObj = {
                    subjectId: subject._id,
                    topics: title,
                    subTopics: lessonPlans[i].subtopics,
                    medium: medium,
                    board: board,
                    standard: Number(standard),
                    orderNumber: Number(orderNumber),
                    indexPath:lessonPlans[i]?.index_path
                };
 
                await this.chapterDao.create(chapterObj);
                chapterCount+=1;

            }
 
            return {
                success: true,
                message: "Data Added!",
                data: {
                    subjectSuccessCount:subjectCount,
                    chapterSuccessCount:chapterCount,
                    indexPathUpdateCount:indexPathCount
                },
            };
        } catch (err) {
            return formatApiReponse(false, err?.message, err);
        }
    }


    async updateChapter(req){
        try{
            let chapters = req.body;
            let updateCounter=0;
        
            for (let i = 0; i < chapters.length; i++) {
              let title = chapters[i]._id.match(titleRegex)[1];
              let medium = chapters[i]._id.match(mediumRegex)[1];
              let board = chapters[i]._id.match(boardRegex)[1];
              let standard = chapters[i]._id.match(standardRegex)[1];
              let orderNumber = chapters[i]._id.match(orderNumberRegex)[1];

              let topicsLearningOutcomes = chapters[i].topics.map(item => {
                return {
                  title: item.title,
                  learningOutcomes: item.learning_outcomes 
                };
              })
        
              let updatedChapter = await Chapter.findOneAndUpdate(
                {
                  board,
                  medium,
                  topics: title,
                  standard: Number(standard),
                  orderNumber: Number(orderNumber),
                },
                {
                  $set: {
                    indexPath: chapters[i].index_path,
                    learningOutcomes:chapters[i].learning_outcomes,
                    topicsLearningOutcomes
                  },
                },
                { new: true }
              );
        
              if(updatedChapter){
                updateCounter+=1
              }
        
            }

          return {
            success: true,
            message: "Chapters updated with index path and LO's!",
            data: {
                chapterUpdateCount:updateCounter
            },
        };

        }catch(err){
            return formatApiReponse(false, err?.message, err);
        }
    }

    async getBySemester(
      filters = {}
    ) {
      try {
        let data = await this.chapterDao.getChapterBySemester(filters);
        return formatApiReponse(true, "", data);
      } catch (err) {
        return formatApiReponse(false, err.message, err);
      }
}
}



module.exports = ChapterManager;

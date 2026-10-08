const BaseManager = require('./base.manager');
const FLNResourceDao = require('../dao/fln.resource.dao');
const fs = require('fs');
const ExcelJS = require('exceljs');
const formatApiReponse = require('../helper/response');

class FLNResourceManager extends BaseManager {
  constructor() {
    super(new FLNResourceDao());
    this.flnResourceDao = new FLNResourceDao();
  }

  async uploadFLNFile(req) {
    try {
      if (!req.file) return formatApiReponse(false, 'No file uploaded', null);
      const fileData = fs.readFileSync(req.file.path, 'utf8');
      const json = JSON.parse(fileData);
      const grades = Object.keys(json.lesson_plan_by_grade || {});
      if (grades.length !== 1) {
        return formatApiReponse(false, 'File must contain exactly one grade', null);
      }
      const grade = grades[0];
      await this.flnResourceDao.Model.deleteMany({ grade });
      const saved = await this.flnResourceDao.Model.create({
        grade,
        originalFileName: req.file.originalname,
        data: json,
        uploadedAt: new Date()
      });
      fs.unlinkSync(req.file.path);
      return formatApiReponse(true, 'File uploaded', { grade, id: saved._id });
    } catch (err) {
      return formatApiReponse(false, err.message, null);
    }
  }

  async getGrades() {
    try {
      const grades = await this.flnResourceDao.Model.distinct('grade');
      return formatApiReponse(true, '', grades);
    } catch (err) {
      return formatApiReponse(false, err.message, null);
    }
  }

  async getDaysByGrade(grade) {
    try {
      const resource = await this.flnResourceDao.Model.findOne({ grade }).sort({ uploadedAt: -1 });
      if (!resource) return formatApiReponse(false, 'No data found for grade ' + grade, null);
      const lessons = resource.data?.lesson_plan_by_grade?.[grade] || [];
      const days = [...new Set(lessons.map(l => l.day))].sort((a, b) => a - b);
      return formatApiReponse(true, '', days);
    } catch (err) {
      return formatApiReponse(false, err.message, null);
    }
  }

  async getLesson(grade, day) {
    try {
      const resource = await this.flnResourceDao.Model.findOne({ grade }).sort({ uploadedAt: -1 });
      if (!resource) return formatApiReponse(false, 'No data found for grade ' + grade, null);
      const lessons = resource.data?.lesson_plan_by_grade?.[grade] || [];
      const lesson = lessons.find(l => l.day === Number(day));
      if (!lesson) return formatApiReponse(false, 'Lesson not found for grade ' + grade + ' and day ' + day, null);
      return formatApiReponse(true, '', lesson);
    } catch (err) {
      return formatApiReponse(false, err.message, null);
    }
  }

  async exportLessonsExcel(grade, res) {
    try {
      const resource = await this.flnResourceDao.Model.findOne({ grade }).sort({ uploadedAt: -1 });
      if (!resource) return formatApiReponse(false, 'No data found for grade ' + grade, null);
      const lessons = resource.data?.lesson_plan_by_grade?.[grade] || [];
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Lessons');
      worksheet.columns = [
        { header: 'Day', key: 'day', width: 8 },
        { header: 'Grade', key: 'grade', width: 12 },
        { header: 'Learning Outcome', key: 'learning_outcome', width: 30 },
        { header: 'Concept', key: 'concept', width: 25 },
        { header: 'Teaching Strategy', key: 'teaching_strategy', width: 30 },
        { header: 'Activity', key: 'activity', width: 30 },
        { header: 'Assessment – Oral', key: 'assessment_oral', width: 30 },
        { header: 'Assessment – Written', key: 'assessment_written', width: 30 },
        { header: 'Practice Questions', key: 'practice_questions', width: 35 },
        { header: 'Teacher Notes', key: 'teacher_notes', width: 30 },
      ];
      lessons.forEach(lesson => {
        worksheet.addRow({
          day: lesson.day,
          grade: lesson.grade,
          learning_outcome: lesson.learning_outcome,
          concept: lesson.concept,
          teaching_strategy: lesson.teaching_strategy,
          activity: lesson.activity,
          assessment_oral: lesson.assessment_questions?.[0] || '',
          assessment_written: lesson.assessment_questions?.[1] || '',
          practice_questions: (lesson.practice_questions || []).join('\n'),
          teacher_notes: lesson.teacher_notes,
        });
      });
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      worksheet.autoFilter = 'A1:J1';
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.columns.forEach(col => {
        col.alignment = { wrapText: true, vertical: 'top' };
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=lesson-plan-${grade.replace(/\s/g, '').toLowerCase()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
      return null;
    } catch (err) {
      return formatApiReponse(false, err.message, null);
    }
  }
}

module.exports = FLNResourceManager; 
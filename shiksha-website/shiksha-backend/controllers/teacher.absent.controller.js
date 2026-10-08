const TeacherAbsent = require('../models/teacher.absent.model');

const teacherAbsentController = {
  getAllAbsentTeachers: async (req, res) => {
    try {
      const absentTeachers = await TeacherAbsent.find()
        .sort({ createdAt: -1 });
      res.json(absentTeachers);
    } catch (error) {
      console.error('Error fetching absent teachers:', error);
      res.status(500).json({ message: 'Error fetching absent teachers', error: error.message });
    }
  },

  getAbsentTeachersByBatch: async (req, res) => {
    try {
      const { batchId } = req.params;
      const absentTeachers = await TeacherAbsent.find({ batchId })
        .sort({ createdAt: -1 });
      res.json(absentTeachers);
    } catch (error) {
      console.error('Error fetching absent teachers for batch:', error);
      res.status(500).json({ message: 'Error fetching absent teachers for batch', error: error.message });
    }
  }
};

module.exports = teacherAbsentController; 
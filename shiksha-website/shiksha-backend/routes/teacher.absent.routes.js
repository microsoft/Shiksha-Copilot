const express = require('express');
const router = express.Router();
const teacherAbsentController = require('../controllers/teacher.absent.controller');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/teacher-absent', isAuthenticated, teacherAbsentController.getAllAbsentTeachers);
router.get('/teacher-absent/batch/:batchId', isAuthenticated, teacherAbsentController.getAbsentTeachersByBatch);

module.exports = router; 
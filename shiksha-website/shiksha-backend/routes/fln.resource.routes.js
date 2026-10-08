const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const flnResourceController = require('../controllers/fln.resource.controller');

router.get('/fln', flnResourceController.getLesson);
router.post('/fln/upload-file', upload.single('file'), flnResourceController.uploadFLNFile);
router.get('/fln/grades', flnResourceController.getGrades);
router.get('/fln/days', flnResourceController.getDaysByGrade);
router.get('/fln/export-excel', flnResourceController.exportLessonsExcel);

module.exports = router; 
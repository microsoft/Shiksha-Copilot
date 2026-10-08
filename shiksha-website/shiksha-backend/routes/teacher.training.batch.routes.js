const express = require('express');
const router = express.Router();
const teacherTrainingBatchController = require('../controllers/teacher.training.batch.controller.js');
const { isAuthenticated } = require('../middlewares/auth.js');
const trainingUploadMiddleware = require('../middlewares/trainingUploadMiddleware.js');


// Create a new teacher training batch (accept any file field name)
router.post('/teacher-training-batches/', isAuthenticated, trainingUploadMiddleware, teacherTrainingBatchController.createBatch);

// Get all teacher training batches
router.get('/teacher-training-batches/', isAuthenticated, teacherTrainingBatchController.getBatches);

// Get teacher training stats
router.get('/teacher-training-batches/stats', isAuthenticated, teacherTrainingBatchController.getTeacherTrainingStats);

// Get a single teacher training batch by ID
router.get('/teacher-training-batches/:batchId', isAuthenticated, teacherTrainingBatchController.getBatchById);

// Delete a teacher training batch
router.delete('/teacher-training-batches/:batchId', isAuthenticated, teacherTrainingBatchController.deleteBatch);

// Assign teacher to batch
router.post('/teacher-training-batches/:batchId/assign-teacher', isAuthenticated, (req, res, next) => {
  next();
}, teacherTrainingBatchController.assignTeacherToBatch);

// Remove teacher from batch
router.post('/teacher-training-batches/:batchId/remove-teacher', isAuthenticated, teacherTrainingBatchController.removeTeacherFromBatch);

// Update batch attendance
router.put('/teacher-training-batches/:batchId/attendance', isAuthenticated, teacherTrainingBatchController.updateAttendance);

// Submit a teacher training batch
router.put('/teacher-training-batches/:batchId/submit', isAuthenticated, teacherTrainingBatchController.submitBatch);

// New route to upload PDF and photos for a specific batch
router.post(
  '/teacher-training-batches/:batchId/upload-pdf',
  isAuthenticated,
  trainingUploadMiddleware,
  teacherTrainingBatchController.uploadPdf
);

// Export batch report as Excel
router.get('/teacher-training-batches/:batchId/export-report', isAuthenticated, teacherTrainingBatchController.exportBatchReport);

module.exports = router; 
const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const publicController = require('../controllers/public.controller');

const router = express.Router();

router.post('/contact', asyncHandler(publicController.createContactMessage));
router.post('/feedback', asyncHandler(publicController.createFeedback));
router.get('/feedback', asyncHandler(publicController.listPublicFeedback));

router.get('/contact', authenticate, allowRoles('admin', 'manager'), asyncHandler(publicController.listContactMessages));
router.get('/feedback/all', authenticate, allowRoles('admin', 'manager'), asyncHandler(publicController.listAllFeedback));
router.patch('/feedback/:id', authenticate, allowRoles('admin', 'manager'), asyncHandler(publicController.updateFeedback));

module.exports = router;

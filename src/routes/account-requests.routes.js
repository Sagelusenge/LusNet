const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const controller = require('../controllers/account-requests.controller');

const router = express.Router();

router.post('/', asyncHandler(controller.createRequest));
router.get('/', authenticate, allowRoles('admin'), asyncHandler(controller.listRequests));
router.post('/:id/approve', authenticate, allowRoles('admin'), asyncHandler(controller.approveRequest));
router.post('/:id/reject', authenticate, allowRoles('admin'), asyncHandler(controller.rejectRequest));

module.exports = router;

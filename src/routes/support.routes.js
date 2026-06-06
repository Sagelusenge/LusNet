const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const supportController = require('../controllers/support.controller');

const router = express.Router();

router.get('/tickets', authenticate, allowRoles('admin', 'manager'), asyncHandler(supportController.listTickets));
router.post('/tickets', authenticate, asyncHandler(supportController.openTicket));
router.patch('/tickets/:id/status', authenticate, allowRoles('admin', 'manager'), asyncHandler(supportController.updateTicketStatus));

module.exports = router;

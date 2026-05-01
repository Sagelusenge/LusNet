const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate } = require('../middleware/auth');
const supportController = require('../controllers/support.controller');

const router = express.Router();

router.get('/tickets', asyncHandler(supportController.listTickets));
router.post('/tickets', authenticate, asyncHandler(supportController.openTicket));
router.patch('/tickets/:id/status', authenticate, asyncHandler(supportController.updateTicketStatus));

module.exports = router;

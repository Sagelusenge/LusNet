const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.use(authenticate, allowRoles('admin', 'manager'));

router.get('/whatsapp', asyncHandler(notificationsController.listWhatsAppLogs));
router.post('/whatsapp/send-j5', asyncHandler(notificationsController.sendWhatsAppReminders));

module.exports = router;

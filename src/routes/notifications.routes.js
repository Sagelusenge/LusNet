const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.use(authenticate);

router.post('/push-token', asyncHandler(notificationsController.registerPushToken));
router.get('/app/me', asyncHandler(notificationsController.listMyMessages));
router.patch('/app/me/:id/read', asyncHandler(notificationsController.markAppMessageRead));

router.use(allowRoles('admin', 'manager'));
router.get('/whatsapp', asyncHandler(notificationsController.listWhatsAppLogs));
router.post('/whatsapp/send-j5', asyncHandler(notificationsController.sendWhatsAppReminders));
router.get('/app', asyncHandler(notificationsController.listAdminMessages));
router.post('/app', asyncHandler(notificationsController.sendAppMessage));

module.exports = router;

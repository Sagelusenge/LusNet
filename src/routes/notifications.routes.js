const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { authenticate, allowRoles } = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.use(authenticate);

router.post('/push-token', asyncHandler(notificationsController.registerPushToken));
router.get('/web-push/public-key', asyncHandler(notificationsController.getWebPushPublicKey));
router.get('/web-push/status', asyncHandler(notificationsController.getWebPushStatus));
router.post('/web-push/subscribe', asyncHandler(notificationsController.subscribeWebPush));
router.delete('/web-push/subscribe', asyncHandler(notificationsController.unsubscribeWebPush));
router.post('/web-push/test', asyncHandler(notificationsController.testWebPush));
router.get('/app/me', asyncHandler(notificationsController.listMyMessages));
router.patch('/app/me/:id/read', asyncHandler(notificationsController.markAppMessageRead));

router.use(allowRoles('admin', 'manager'));
router.get('/whatsapp', asyncHandler(notificationsController.listWhatsAppLogs));
router.post('/whatsapp/send-j5', asyncHandler(notificationsController.sendWhatsAppReminders));
router.post('/web-push/deadlines/run', asyncHandler(notificationsController.runDeadlinePushAlerts));
router.get('/app', asyncHandler(notificationsController.listAdminMessages));
router.post('/app', asyncHandler(notificationsController.sendAppMessage));

module.exports = router;

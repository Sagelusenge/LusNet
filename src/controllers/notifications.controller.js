const { sendFiveDayReminders, listNotificationLogs } = require('../services/reminder.service');

async function listWhatsAppLogs(req, res) {
  const logs = await listNotificationLogs();
  res.json({ success: true, data: logs });
}

async function sendWhatsAppReminders(req, res) {
  const results = await sendFiveDayReminders();
  res.json({
    success: true,
    data: {
      sent: results.filter((item) => item.status === 'envoye').length,
      failed: results.filter((item) => item.status === 'echoue').length,
      results
    }
  });
}

module.exports = {
  listWhatsAppLogs,
  sendWhatsAppReminders
};

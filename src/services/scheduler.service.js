const { sendFiveDayReminders } = require('./reminder.service');
const { sendDeadlinePushAlerts } = require('./web-push.service');
const env = require('../config/env');

function startReminderScheduler() {
  const whatsappEnabled = process.env.WHATSAPP_AUTO_REMINDERS !== 'false';
  const webPushEnabled = env.webPush.enabled;
  if (!whatsappEnabled && !webPushEnabled) return;

  let lastRunDate = '';

  async function runOncePerDay() {
    const today = new Date().toISOString().slice(0, 10);
    if (lastRunDate === today) return;
    lastRunDate = today;

    try {
      if (whatsappEnabled) {
        const whatsappResults = await sendFiveDayReminders();
        console.log(`Rappels WhatsApp J-5 verifies: ${whatsappResults.length}`);
      }
      if (webPushEnabled) {
        const pushResults = await sendDeadlinePushAlerts();
        console.log(`Alertes Web Push echeances verifiees: ${pushResults.length}`);
      }
    } catch (error) {
      lastRunDate = '';
      console.warn('Echec verification rappels WhatsApp:', error.message);
    }
  }

  setTimeout(runOncePerDay, 30 * 1000);
  setInterval(runOncePerDay, 6 * 60 * 60 * 1000);
}

module.exports = {
  startReminderScheduler
};

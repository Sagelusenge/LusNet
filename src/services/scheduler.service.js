const { sendFiveDayReminders } = require('./reminder.service');

function startReminderScheduler() {
  if (process.env.WHATSAPP_AUTO_REMINDERS === 'false') return;

  let lastRunDate = '';

  async function runOncePerDay() {
    const today = new Date().toISOString().slice(0, 10);
    if (lastRunDate === today) return;
    lastRunDate = today;

    try {
      const results = await sendFiveDayReminders();
      console.log(`Rappels WhatsApp J-5 verifies: ${results.length}`);
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

const { pool } = require('../src/config/database');
const { sendFiveDayReminders } = require('../src/services/reminder.service');

async function main() {
  const results = await sendFiveDayReminders();
  console.log(`Notifications traitees: ${results.length}`);
  console.table(results);
  await pool.end();
}

main().catch(async (error) => {
  console.error('Envoi des notifications echoue:', error.message);
  await pool.end();
  process.exit(1);
});

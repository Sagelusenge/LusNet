const { pool } = require('../src/config/database');

async function count(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0].total;
}

async function main() {
  const [tables] = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const [views] = await pool.query(
    `SELECT table_name
     FROM information_schema.views
     WHERE table_schema = DATABASE()
     ORDER BY table_name`
  );
  const [procedures] = await pool.query(
    `SELECT routine_name
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_type = 'PROCEDURE'
     ORDER BY routine_name`
  );

  console.log('Tables:', tables.map((item) => item.TABLE_NAME || item.table_name).join(', '));
  console.log('Vues:', views.map((item) => item.TABLE_NAME || item.table_name).join(', '));
  console.log('Procedures:', procedures.map((item) => item.ROUTINE_NAME || item.routine_name).join(', '));
  console.log('Bouquets:', await count('SELECT COUNT(*) AS total FROM internet_plans'));
  console.log('Kits materiel:', await count('SELECT COUNT(*) AS total FROM equipment_kits'));
  console.log('Tables devis:', await count("SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'quote_requests'"));
  console.log('Tables WhatsApp:', await count("SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'whatsapp_notification_logs'"));

  await pool.end();
}

main().catch(async (error) => {
  console.error('Verification BD echouee:', error.message);
  await pool.end();
  process.exit(1);
});

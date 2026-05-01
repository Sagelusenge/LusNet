const { pool } = require('../src/config/database');

async function main() {
  const [rows] = await pool.query('SELECT DATABASE() AS database_name, NOW() AS checked_at');
  console.log('Connexion BD OK:', rows[0]);
  await pool.end();
}

main().catch(async (error) => {
  console.error('Connexion BD echouee:', error.message);
  await pool.end();
  process.exit(1);
});

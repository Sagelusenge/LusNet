const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function main() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true
  });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', '017_client_account_requests.sql'), 'utf8');
  await connection.query(sql);
  await connection.end();
  console.log('Migration des demandes de comptes terminee.');
}

main().catch((error) => {
  console.error('Migration echouee:', error.message);
  process.exit(1);
});

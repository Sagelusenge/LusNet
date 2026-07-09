const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const files = [
  path.join(__dirname, '..', 'database', '001_initial_schema.sql'),
  path.join(__dirname, '..', 'database', '009_contract_custom_plan.sql'),
  path.join(__dirname, '..', 'database', '010_contract_due_day_31.sql'),
  path.join(__dirname, '..', 'database', '011_contract_equipment_terms.sql'),
  path.join(__dirname, '..', 'database', '012_invoice_type_status.sql'),
  path.join(__dirname, '..', 'database', '013_invoice_installation_amount.sql'),
  path.join(__dirname, '..', 'database', '014_equipment_network_details.sql'),
  path.join(__dirname, '..', 'database', '015_web_push_deadline_alerts.sql'),
  path.join(__dirname, '..', 'database', '016_equipment_stock_quantity.sql'),
  path.join(__dirname, '..', 'database', '002_views_procedures.sql'),
  path.join(__dirname, '..', 'database', '003_quote_requests_and_client_users.sql'),
  path.join(__dirname, '..', 'database', '004_whatsapp_notifications.sql'),
  path.join(__dirname, '..', 'database', '005_contact_feedback.sql'),
  path.join(__dirname, '..', 'database', '006_app_messages_push.sql'),
  path.join(__dirname, '..', 'database', '007_budget.sql'),
  path.join(__dirname, '..', 'database', '008_other_plan.sql')
];

function splitSqlStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (/^DELIMITER\s+/i.test(trimmed)) {
      delimiter = trimmed.replace(/^DELIMITER\s+/i, '');
      continue;
    }

    buffer += `${line}\n`;

    if (buffer.trimEnd().endsWith(delimiter)) {
      const statement = buffer.trimEnd().slice(0, -delimiter.length).trim();
      if (statement) statements.push(statement);
      buffer = '';
    }
  }

  const lastStatement = buffer.trim();
  if (lastStatement) statements.push(lastStatement);

  return statements;
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.ssl ? env.db.database : undefined,
    ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
    multipleStatements: false
  });

  for (const file of files) {
    console.log(`Execution: ${path.relative(process.cwd(), file)}`);
    const sql = fs.readFileSync(file, 'utf8');
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      if (env.db.ssl && (/CREATE\s+DATABASE/i.test(statement) || /USE\s+lwasiva_net/i.test(statement))) {
        continue;
      }

      await connection.query(statement);
    }
  }

  await connection.end();
  console.log('Base de donnees initialisee avec succes.');
}

main().catch((error) => {
  console.error('Initialisation BD echouee:', error.message);
  process.exit(1);
});

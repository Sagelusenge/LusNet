const bcrypt = require('bcryptjs');
const { getConnection, pool } = require('../src/config/database');

async function main() {
  const fullName = process.env.ADMIN_FULL_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!fullName || !email || !password) {
    throw new Error('ADMIN_FULL_NAME, ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await getConnection();

  try {
    await connection.execute(
      `INSERT INTO users (full_name, phone, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'admin', TRUE)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         password_hash = VALUES(password_hash),
         role = 'admin',
         is_active = TRUE`,
      [fullName, null, email, passwordHash]
    );

    const [rows] = await connection.execute(
      `SELECT id, full_name, email, role, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    console.log(JSON.stringify(rows[0] || null));
  } finally {
    connection.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });

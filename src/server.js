const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connexion BD OK');
  } catch (error) {
    console.warn('API demarree sans connexion BD:', error.message);
  }

  app.listen(env.port, () => {
    console.log(`LWASIVA_NET API demarree sur http://localhost:${env.port}`);
  });
}

start();

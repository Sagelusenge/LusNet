const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lwasiva_net',
    ssl: process.env.DB_SSL === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret_before_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    provider: process.env.WHATSAPP_PROVIDER || 'meta',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    fromNumber: process.env.WHATSAPP_FROM_NUMBER || '243980208012'
  },
  webPush: {
    enabled: process.env.WEB_PUSH_DEADLINE_ALERTS !== 'false',
    subject: process.env.WEB_PUSH_SUBJECT || 'mailto:admin@example.com',
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY || '',
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY || ''
  }
};

module.exports = env;

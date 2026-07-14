const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (!env.email.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: { user: env.email.user, pass: env.email.password }
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendEmail({ to, subject, text, html }) {
  const client = getTransporter();
  if (!client || !to) return { sent: false, reason: 'not_configured' };

  const info = await client.sendMail({
    from: env.email.from,
    to,
    replyTo: env.email.replyTo,
    subject,
    text,
    html
  });
  return { sent: true, messageId: info.messageId };
}

module.exports = { sendEmail, escapeHtml };

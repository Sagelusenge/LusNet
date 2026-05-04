const { sendFiveDayReminders, listNotificationLogs } = require('../services/reminder.service');
const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function sendExpoPush(tokens, title, body) {
  if (!tokens.length) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: 'default' })))
  }).catch(() => null);
}

async function listWhatsAppLogs(req, res) {
  const logs = await listNotificationLogs();
  res.json({ success: true, data: logs });
}

async function sendWhatsAppReminders(req, res) {
  const results = await sendFiveDayReminders();
  res.json({
    success: true,
    data: {
      sent: results.filter((item) => item.status === 'envoye').length,
      failed: results.filter((item) => item.status === 'echoue').length,
      results
    }
  });
}

async function registerPushToken(req, res) {
  const { expoPushToken, deviceName, platform } = req.body;
  if (!expoPushToken) throw new HttpError(400, 'Token push obligatoire');

  await query(
    `INSERT INTO app_push_tokens (user_id, expo_push_token, device_name, platform, is_active)
     VALUES (?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), device_name = VALUES(device_name),
       platform = VALUES(platform), is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, expoPushToken, deviceName || null, platform || null]
  );

  res.status(201).json({ success: true, message: 'Notifications activees' });
}

async function listAdminMessages(req, res) {
  const rows = await query('SELECT * FROM vw_app_messages_admin ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}

async function listMyMessages(req, res) {
  const rows = await query(
    'SELECT * FROM vw_app_messages_user WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ success: true, data: rows });
}

async function sendAppMessage(req, res) {
  const { title, body, targetRole = 'all' } = req.body;
  if (!title || !body) throw new HttpError(400, 'Titre et message sont obligatoires');

  const result = await query(
    'INSERT INTO app_messages (title, body, target_role, created_by) VALUES (?, ?, ?, ?)',
    [title, body, targetRole, req.user.id]
  );

  const users = await query(
    `SELECT id FROM users
     WHERE is_active = TRUE
       AND (? = 'all' OR role = ?)`,
    [targetRole, targetRole]
  );

  if (users.length) {
    await query(
      `INSERT IGNORE INTO app_message_recipients (message_id, user_id)
       VALUES ${users.map(() => '(?, ?)').join(', ')}`,
      users.flatMap((user) => [result.insertId, user.id])
    );
  }

  const tokens = await query(
    `SELECT expo_push_token FROM app_push_tokens apt
     INNER JOIN users u ON u.id = apt.user_id
     WHERE apt.is_active = TRUE
       AND u.is_active = TRUE
       AND (? = 'all' OR u.role = ?)`,
    [targetRole, targetRole]
  );

  await sendExpoPush(tokens.map((item) => item.expo_push_token), title, body);

  res.status(201).json({ success: true, data: { id: result.insertId, recipients: users.length } });
}

async function markAppMessageRead(req, res) {
  await query(
    'UPDATE app_message_recipients SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  res.json({ success: true, message: 'Message marque comme lu' });
}

module.exports = {
  listWhatsAppLogs,
  sendWhatsAppReminders,
  registerPushToken,
  listAdminMessages,
  listMyMessages,
  sendAppMessage,
  markAppMessageRead
};

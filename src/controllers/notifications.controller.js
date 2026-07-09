const { sendFiveDayReminders, listNotificationLogs } = require('../services/reminder.service');
const { sendToUser, sendDeadlinePushAlerts } = require('../services/web-push.service');
const { query } = require('../config/database');
const env = require('../config/env');
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

async function getWebPushPublicKey(req, res) {
  res.json({
    success: true,
    data: {
      publicKey: env.webPush.publicKey,
      configured: Boolean(env.webPush.publicKey && env.webPush.privateKey)
    }
  });
}

async function getWebPushStatus(req, res) {
  const rows = await query(
    `SELECT COUNT(*) AS active_subscriptions
     FROM web_push_subscriptions
     WHERE user_id = ? AND is_active = TRUE`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      enabled: Number(rows[0]?.active_subscriptions || 0) > 0,
      subscriptions: Number(rows[0]?.active_subscriptions || 0)
    }
  });
}

async function subscribeWebPush(req, res) {
  const { subscription, userAgent } = req.body;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const authSecret = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !authSecret) {
    throw new HttpError(400, 'Abonnement Web Push incomplet');
  }

  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint);
  } catch (error) {
    throw new HttpError(400, 'Endpoint Web Push invalide');
  }
  if (endpointUrl.protocol !== 'https:') {
    throw new HttpError(400, 'Endpoint Web Push non securise');
  }

  await query(
    `INSERT INTO web_push_subscriptions (
      user_id, endpoint, p256dh, auth_secret, expiration_time, user_agent, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, TRUE)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth_secret = VALUES(auth_secret),
      expiration_time = VALUES(expiration_time), user_agent = VALUES(user_agent),
      is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
    [
      req.user.id,
      endpoint,
      p256dh,
      authSecret,
      subscription.expirationTime || null,
      userAgent || req.headers['user-agent'] || null
    ]
  );

  res.status(201).json({ success: true, message: 'Notifications navigateur activees' });
}

async function unsubscribeWebPush(req, res) {
  const { endpoint } = req.body;
  if (!endpoint) throw new HttpError(400, 'Endpoint Web Push obligatoire');

  await query(
    `UPDATE web_push_subscriptions
     SET is_active = FALSE
     WHERE user_id = ? AND endpoint = ?`,
    [req.user.id, endpoint]
  );

  res.json({ success: true, message: 'Notifications navigateur desactivees' });
}

async function testWebPush(req, res) {
  const result = await sendToUser(req.user.id, {
    title: 'LWASIVA_NET - Test notification',
    body: 'Les notifications d echeance sont correctement activees sur cet appareil.',
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    tag: `web-push-test-${req.user.id}`,
    url: '/',
    urgent: false
  });

  if (result.sent === 0) {
    throw new HttpError(409, 'Aucun appareil actif pour recevoir la notification');
  }

  res.json({ success: true, data: result });
}

async function runDeadlinePushAlerts(req, res) {
  const results = await sendDeadlinePushAlerts();
  res.json({
    success: true,
    data: {
      sent: results.filter((item) => item.status === 'envoye').length,
      skipped: results.filter((item) => item.status === 'sans_abonnement').length,
      failed: results.filter((item) => item.status === 'echoue').length,
      results
    }
  });
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
  await Promise.all(users.map((user) => sendToUser(user.id, {
    title,
    body,
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    tag: `app-message-${result.insertId}`,
    url: '/',
    urgent: false
  })));

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
  getWebPushPublicKey,
  getWebPushStatus,
  subscribeWebPush,
  unsubscribeWebPush,
  testWebPush,
  runDeadlinePushAlerts,
  listAdminMessages,
  listMyMessages,
  sendAppMessage,
  markAppMessageRead
};

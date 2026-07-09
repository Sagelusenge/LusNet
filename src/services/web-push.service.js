const webPush = require('web-push');
const { query } = require('../config/database');
const env = require('../config/env');

let configured = false;

function configureWebPush() {
  if (configured) return true;
  if (!env.webPush.publicKey || !env.webPush.privateKey) return false;

  webPush.setVapidDetails(
    env.webPush.subject,
    env.webPush.publicKey,
    env.webPush.privateKey
  );
  configured = true;
  return true;
}

function subscriptionFromRow(row) {
  return {
    endpoint: row.endpoint,
    expirationTime: row.expiration_time ? Number(row.expiration_time) : null,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth_secret
    }
  };
}

async function sendToUser(userId, payload) {
  if (!configureWebPush()) {
    return { sent: 0, failed: 0, unavailable: true };
  }

  const subscriptions = await query(
    `SELECT * FROM web_push_subscriptions
     WHERE user_id = ? AND is_active = TRUE
     ORDER BY updated_at DESC`,
    [userId]
  );

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(
        subscriptionFromRow(subscription),
        JSON.stringify(payload),
        { TTL: 24 * 60 * 60, urgency: payload.urgent ? 'high' : 'normal' }
      );
      sent += 1;
      await query(
        `UPDATE web_push_subscriptions
         SET last_success_at = NOW(), last_error_at = NULL, is_active = TRUE
         WHERE id = ?`,
        [subscription.id]
      );
    } catch (error) {
      failed += 1;
      const expired = error.statusCode === 404 || error.statusCode === 410;
      await query(
        `UPDATE web_push_subscriptions
         SET last_error_at = NOW(), is_active = ?
         WHERE id = ?`,
        [!expired, subscription.id]
      );
    }
  }

  return { sent, failed, unavailable: subscriptions.length === 0 };
}

function deadlinePayload(contract, alertDay) {
  const expirationDate = new Date(`${contract.expiration_date}T00:00:00`).toLocaleDateString('fr-FR');
  const timing = alertDay === 0
    ? 'arrive a echeance aujourd hui'
    : `arrive a echeance dans ${alertDay} jour${alertDay > 1 ? 's' : ''}`;

  return {
    title: alertDay === 0 ? 'Echeance abonnement aujourd hui' : `Echeance abonnement J-${alertDay}`,
    body: `${contract.client_name} - ${contract.plan_name} ${timing} (${expirationDate}).`,
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
    tag: `deadline-${contract.contract_id}-${contract.expiration_date}-${alertDay}`,
    url: '/',
    urgent: alertDay <= 1,
    requireInteraction: alertDay === 0
  };
}

async function findDeadlineContracts() {
  return query(
    `SELECT c.id AS contract_id, c.client_id, c.contract_number, c.activated_at,
            DATE_ADD(DATE(c.activated_at), INTERVAL 30 DAY) AS expiration_date,
            DATEDIFF(DATE_ADD(DATE(c.activated_at), INTERVAL 30 DAY), CURRENT_DATE) AS alert_day,
            cl.full_name AS client_name, ip.name AS plan_name
     FROM contracts c
     INNER JOIN clients cl ON cl.id = c.client_id
     INNER JOIN internet_plans ip ON ip.id = c.plan_id
     WHERE c.activated_at IS NOT NULL
       AND c.status IN ('essai', 'actif', 'suspendu')
       AND DATEDIFF(DATE_ADD(DATE(c.activated_at), INTERVAL 30 DAY), CURRENT_DATE) IN (5, 3, 1, 0)`
  );
}

async function deadlineRecipients(clientId) {
  return query(
    `SELECT DISTINCT id
     FROM users
     WHERE is_active = TRUE
       AND (role IN ('admin', 'manager') OR client_id = ?)`,
    [clientId]
  );
}

async function sendDeadlinePushAlerts() {
  if (!env.webPush.enabled || !configureWebPush()) return [];

  const contracts = await findDeadlineContracts();
  const results = [];

  for (const contract of contracts) {
    const alertDay = Number(contract.alert_day);
    const recipients = await deadlineRecipients(contract.client_id);

    for (const recipient of recipients) {
      const existingLogs = await query(
        `SELECT id, status
         FROM deadline_push_logs
         WHERE contract_id = ? AND user_id = ? AND expiration_date = ? AND alert_day = ?
         LIMIT 1`,
        [contract.contract_id, recipient.id, contract.expiration_date, alertDay]
      );

      if (existingLogs[0]?.status === 'envoye') continue;

      let logId = existingLogs[0]?.id;
      if (logId) {
        await query(
          `UPDATE deadline_push_logs
           SET status = 'en_attente', error_message = NULL
           WHERE id = ?`,
          [logId]
        );
      } else {
        const log = await query(
          `INSERT INTO deadline_push_logs (
            contract_id, user_id, expiration_date, alert_day, status
          ) VALUES (?, ?, ?, ?, 'en_attente')`,
          [contract.contract_id, recipient.id, contract.expiration_date, alertDay]
        );
        logId = log.insertId;
      }

      try {
        const delivery = await sendToUser(recipient.id, deadlinePayload(contract, alertDay));
        const status = delivery.sent > 0 ? 'envoye' : delivery.unavailable ? 'sans_abonnement' : 'echoue';
        await query(
          `UPDATE deadline_push_logs
           SET status = ?, sent_at = CASE WHEN ? = 'envoye' THEN NOW() ELSE NULL END,
               error_message = CASE WHEN ? = 'echoue' THEN 'Echec de livraison Web Push' ELSE NULL END
           WHERE id = ?`,
          [status, status, status, logId]
        );
        results.push({ contractId: contract.contract_id, userId: recipient.id, alertDay, status });
      } catch (error) {
        await query(
          `UPDATE deadline_push_logs
           SET status = 'echoue', error_message = ?
           WHERE id = ?`,
          [error.message, logId]
        );
        results.push({ contractId: contract.contract_id, userId: recipient.id, alertDay, status: 'echoue' });
      }
    }
  }

  return results;
}

module.exports = {
  configureWebPush,
  sendToUser,
  sendDeadlinePushAlerts
};

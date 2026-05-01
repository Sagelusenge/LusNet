const { query } = require('../config/database');
const { normalizePhone, sendWhatsAppText } = require('./whatsapp.service');

function buildReminderMessage(item) {
  return [
    `Bonjour ${item.client_name},`,
    `LWASIVA_NET vous informe que votre abonnement Internet ${item.plan_name} prend fin le ${item.period_end}.`,
    `Montant a prevoir: ${Number(item.total_amount_usd || 0).toFixed(2)} USD.`,
    'Merci de renouveler votre abonnement pour eviter une interruption du service.',
    'Contact officiel: +243 980 208 012.'
  ].join('\n');
}

async function findFiveDayReminders() {
  return query(
    `SELECT
       i.id AS invoice_id,
       i.invoice_number,
       i.period_end,
       i.total_amount_usd,
       c.id AS contract_id,
       cl.id AS client_id,
       cl.full_name AS client_name,
       cl.phone,
       ip.name AS plan_name
     FROM invoices i
     INNER JOIN contracts c ON c.id = i.contract_id
     INNER JOIN clients cl ON cl.id = c.client_id
     INNER JOIN internet_plans ip ON ip.id = c.plan_id
     LEFT JOIN whatsapp_notification_logs wnl
       ON wnl.invoice_id = i.id
      AND wnl.notification_type = 'abonnement_j_5'
      AND wnl.phone = cl.phone
     WHERE i.period_end = DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY)
       AND i.status <> 'annulee'
       AND c.status IN ('essai', 'actif', 'suspendu')
       AND wnl.id IS NULL`
  );
}

async function sendFiveDayReminders() {
  const reminders = await findFiveDayReminders();
  const results = [];

  for (const item of reminders) {
    const phone = normalizePhone(item.phone);
    const message = buildReminderMessage(item);
    const insertResult = await query(
      `INSERT INTO whatsapp_notification_logs (
        client_id, contract_id, invoice_id, phone, message, notification_type, status
      ) VALUES (?, ?, ?, ?, ?, 'abonnement_j_5', 'en_attente')`,
      [item.client_id, item.contract_id, item.invoice_id, phone, message]
    );

    try {
      const providerResult = await sendWhatsAppText({ to: phone, message });
      await query(
        `UPDATE whatsapp_notification_logs
         SET status = 'envoye', provider_message_id = ?, sent_at = NOW()
         WHERE id = ?`,
        [providerResult.id, insertResult.insertId]
      );
      results.push({ invoiceId: item.invoice_id, phone, status: 'envoye', simulated: providerResult.simulated });
    } catch (error) {
      await query(
        `UPDATE whatsapp_notification_logs
         SET status = 'echoue', error_message = ?
         WHERE id = ?`,
        [error.message, insertResult.insertId]
      );
      results.push({ invoiceId: item.invoice_id, phone, status: 'echoue', error: error.message });
    }
  }

  return results;
}

async function listNotificationLogs() {
  return query('SELECT * FROM vw_whatsapp_notification_logs ORDER BY created_at DESC');
}

module.exports = {
  sendFiveDayReminders,
  listNotificationLogs
};

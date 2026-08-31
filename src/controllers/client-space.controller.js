const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

function ensureClient(req) {
  if (req.user.role !== 'client' || !req.user.clientId) {
    throw new HttpError(403, 'Espace reserve au client');
  }
}

async function getMySpace(req, res) {
  ensureClient(req);

  const clients = await query('SELECT * FROM clients WHERE id = ?', [req.user.clientId]);
  const contracts = await query(
    `SELECT
       c.*,
       ip.name AS plan_name,
       ip.bandwidth_mbps,
       ip.monthly_price_usd,
       COALESCE((
         SELECT SUM(TIMESTAMPDIFF(SECOND, ss.suspended_at, ss.restored_at))
         FROM service_suspensions ss
         WHERE ss.contract_id = c.id
           AND ss.restored_at IS NOT NULL
       ), 0) AS completed_suspension_seconds,
       CASE
         WHEN c.status = 'suspendu' THEN COALESCE((
           SELECT MAX(ss.suspended_at)
           FROM service_suspensions ss
           WHERE ss.contract_id = c.id
             AND ss.restored_at IS NULL
         ), c.updated_at)
         ELSE NULL
       END AS current_suspended_at
     FROM contracts c
     INNER JOIN internet_plans ip ON ip.id = c.plan_id
     WHERE c.client_id = ?
     ORDER BY c.created_at DESC`,
    [req.user.clientId]
  );
  const invoices = await query(
    `SELECT
       i.*,
       COALESCE((SELECT SUM(p.amount_usd) FROM payments p WHERE p.invoice_id = i.id), 0.00) AS paid_amount_usd
     FROM invoices i
     INNER JOIN contracts c ON c.id = i.contract_id
     WHERE c.client_id = ?
     ORDER BY i.created_at DESC`,
    [req.user.clientId]
  );
  const payments = await query(
    `SELECT *
     FROM payments
     WHERE client_id = ?
     ORDER BY paid_at DESC`,
    [req.user.clientId]
  );
  const tickets = await query(
    `SELECT st.*, c.contract_number
     FROM support_tickets st
     LEFT JOIN contracts c ON c.id = st.contract_id
     WHERE st.client_id = ?
     ORDER BY st.opened_at DESC`,
    [req.user.clientId]
  );
  const equipmentStatus = await query(
    `SELECT
       c.id AS contract_id,
       c.contract_number,
       COALESCE(eq.equipment_kit, 'Materiel contrat') AS equipment_kit,
       COALESCE(c.equipment_total_price_usd, 100.00) AS equipment_total_usd,
       COALESCE(ep.equipment_paid_usd, 0.00) AS equipment_paid_usd,
       GREATEST(COALESCE(c.equipment_total_price_usd, 100.00) - COALESCE(ep.equipment_paid_usd, 0.00), 0.00) AS equipment_remaining_usd
     FROM contracts c
     LEFT JOIN (
       SELECT ce.contract_id, GROUP_CONCAT(DISTINCT ek.name ORDER BY ek.name SEPARATOR ', ') AS equipment_kit
       FROM contract_equipment ce
       INNER JOIN equipment_kits ek ON ek.id = ce.equipment_kit_id
       GROUP BY ce.contract_id
     ) eq ON eq.contract_id = c.id
     LEFT JOIN (
       SELECT contract_id, SUM(CASE WHEN status = 'payee' THEN amount_usd ELSE 0 END) AS equipment_paid_usd
       FROM equipment_installments
       GROUP BY contract_id
     ) ep ON ep.contract_id = c.id
     WHERE c.client_id = ?
     ORDER BY c.created_at DESC`,
    [req.user.clientId]
  );

  res.json({
    success: true,
    data: {
      client: clients[0] || null,
      contracts,
      invoices,
      payments,
      tickets,
      equipmentStatus
    }
  });
}

async function updateMyProfile(req, res) {
  ensureClient(req);

  const { fullName, phone, email, address } = req.body;

  if (!fullName || !phone || !address) {
    throw new HttpError(400, 'Nom, telephone et adresse sont obligatoires');
  }

  await query(
    `UPDATE clients
     SET full_name = ?, phone = ?, email = ?, address = ?
     WHERE id = ?`,
    [fullName, phone, email || null, address, req.user.clientId]
  );

  await query(
    `UPDATE users
     SET full_name = ?, phone = ?, email = ?
     WHERE id = ?`,
    [fullName, phone, email || null, req.user.id]
  );

  res.json({ success: true, message: 'Profil client mis a jour' });
}

module.exports = {
  getMySpace,
  updateMyProfile
};

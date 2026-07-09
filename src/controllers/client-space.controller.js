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
    `SELECT c.*, ip.name AS plan_name, ip.bandwidth_mbps, ip.monthly_price_usd
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
       COALESCE(ek.name, 'Materiel contrat') AS equipment_kit,
       COALESCE(ek.total_price_usd, c.equipment_total_price_usd) AS equipment_total_usd,
       COALESCE(SUM(CASE WHEN ei.status = 'payee' THEN ei.amount_usd ELSE 0 END), 0.00) AS equipment_paid_usd,
       GREATEST(COALESCE(ek.total_price_usd, c.equipment_total_price_usd) - COALESCE(SUM(CASE WHEN ei.status = 'payee' THEN ei.amount_usd ELSE 0 END), 0.00), 0.00) AS equipment_remaining_usd
     FROM contracts c
     LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
     LEFT JOIN equipment_kits ek ON ek.id = ce.equipment_kit_id
     LEFT JOIN equipment_installments ei ON ei.contract_id = c.id
     WHERE c.client_id = ?
     GROUP BY c.id, c.contract_number, ek.name, ek.total_price_usd, c.equipment_total_price_usd
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

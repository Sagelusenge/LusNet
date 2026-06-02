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
    `SELECT i.*
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

  res.json({
    success: true,
    data: {
      client: clients[0] || null,
      contracts,
      invoices,
      payments
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

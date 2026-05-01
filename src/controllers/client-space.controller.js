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

module.exports = {
  getMySpace
};

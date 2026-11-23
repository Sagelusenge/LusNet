const { validatePlan } = require('../utils/plan-input');
const HttpError = require('../utils/http-error');
const { query } = require('../config/database');

async function listPlans(req, res) {
  const plans = await query('SELECT * FROM internet_plans ORDER BY monthly_price_usd ASC');
  res.json({ success: true, data: plans });
}

async function createPlan(req, res) {
  const values = validatePlan(req.body);
  const result = await query(
    `INSERT INTO internet_plans (name, bandwidth_mbps, recommended_usage, monthly_price_usd, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    values
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updatePlan(req, res) {
  const values = validatePlan(req.body);
  const existing = await query('SELECT name FROM internet_plans WHERE id = ?', [req.params.id]);
  if (!existing.length) throw new HttpError(404, 'Bouquet introuvable');
  if ((existing[0].name === 'Autre') !== (values[0] === 'Autre')) throw new HttpError(400, 'Le nom Autre est réservé au tarif personnalisé');
  await query(
    `UPDATE internet_plans
     SET name = ?, bandwidth_mbps = ?, recommended_usage = ?, monthly_price_usd = ?, is_active = ?
     WHERE id = ?`,
    [...values, req.params.id]
  );

  res.json({ success: true, message: 'Bouquet mis a jour' });
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan
};

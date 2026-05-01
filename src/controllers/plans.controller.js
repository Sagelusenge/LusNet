const { query } = require('../config/database');

async function listPlans(req, res) {
  const plans = await query('SELECT * FROM internet_plans ORDER BY monthly_price_usd ASC');
  res.json({ success: true, data: plans });
}

async function createPlan(req, res) {
  const { name, bandwidthMbps, recommendedUsage, monthlyPriceUsd, isActive = true } = req.body;
  const result = await query(
    `INSERT INTO internet_plans (name, bandwidth_mbps, recommended_usage, monthly_price_usd, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [name, bandwidthMbps, recommendedUsage, monthlyPriceUsd, isActive]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updatePlan(req, res) {
  const { name, bandwidthMbps, recommendedUsage, monthlyPriceUsd, isActive } = req.body;
  await query(
    `UPDATE internet_plans
     SET name = ?, bandwidth_mbps = ?, recommended_usage = ?, monthly_price_usd = ?, is_active = ?
     WHERE id = ?`,
    [name, bandwidthMbps, recommendedUsage, monthlyPriceUsd, isActive, req.params.id]
  );

  res.json({ success: true, message: 'Bouquet mis a jour' });
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan
};

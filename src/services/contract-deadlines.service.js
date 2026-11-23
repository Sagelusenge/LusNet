const { query } = require('../config/database');
async function attachDeadlineDetails(contracts) {
  if (!contracts.length) return contracts;
  const ids = contracts.map(c => c.contract_id || c.id);
  const placeholders = ids.map(() => '?').join(',');
  const suspensions = await query(`SELECT contract_id, suspended_at, restored_at FROM service_suspensions WHERE contract_id IN (${placeholders}) ORDER BY suspended_at`, ids);
  let corrections = [];
  try {
    corrections = await query(`SELECT * FROM contract_deadline_corrections WHERE contract_id IN (${placeholders})`, ids);
  } catch (error) { if (error.code !== 'ER_NO_SUCH_TABLE') throw error; }
  return contracts.map(c => ({ ...c, suspensions:suspensions.filter(s => String(s.contract_id) === String(c.contract_id || c.id)), deadline_correction:corrections.find(s => String(s.contract_id) === String(c.contract_id || c.id)) || null }));
}
module.exports = { attachDeadlineDetails };

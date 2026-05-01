const { query } = require('../config/database');

async function getSummary(req, res) {
  const rows = await query('SELECT * FROM vw_dashboard_summary');
  res.json({ success: true, data: rows[0] });
}

module.exports = {
  getSummary
};

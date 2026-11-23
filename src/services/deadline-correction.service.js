const fs = require('fs');
const path = require('path');
const { getConnection } = require('../config/database');
const HttpError = require('../utils/http-error');
function validateCorrection({ expiresOn, reason }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn || '') || !Number.isFinite(Date.parse(expiresOn)) || new Date(expiresOn).toISOString().slice(0,10) !== expiresOn || typeof reason !== 'string' || !reason.trim() || reason.length > 500) {
    throw new HttpError(400, 'Date valide et motif de correction (500 caractères maximum) obligatoires');
  }
}
async function correctDeadline(contractId, body, userId = null) {
  validateCorrection(body);
  const connection = await getConnection();
  try {
    await connection.query(fs.readFileSync(path.join(__dirname, '../../database/019_contract_deadline_corrections.sql'), 'utf8'));
    await connection.beginTransaction();
    const [contracts] = await connection.execute('SELECT id FROM contracts WHERE id = ? FOR UPDATE', [contractId]);
    if (!contracts.length) throw new HttpError(404, 'Contrat introuvable');
    const [[cutoff]] = await connection.execute('SELECT COALESCE(MAX(id), 0) AS id FROM invoices WHERE contract_id = ?', [contractId]);
    const [[paymentCutoff]] = await connection.execute('SELECT COALESCE(MAX(id), 0) AS id FROM payments WHERE contract_id = ?', [contractId]);
    await connection.execute(`INSERT INTO contract_deadline_corrections (contract_id, expires_on, invoice_id_cutoff, payment_id_cutoff, reason, corrected_by)
      VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE expires_on=VALUES(expires_on), invoice_id_cutoff=VALUES(invoice_id_cutoff), payment_id_cutoff=VALUES(payment_id_cutoff), reason=VALUES(reason), corrected_by=VALUES(corrected_by), corrected_at=CURRENT_TIMESTAMP`,
      [contractId, body.expiresOn, cutoff.id, paymentCutoff.id, body.reason.trim(), userId]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
module.exports = { correctDeadline, validateCorrection };

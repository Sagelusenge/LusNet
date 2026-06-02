const { getConnection, query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listInvoices(req, res) {
  const invoices = await query(
    `SELECT i.*, c.contract_number, cl.full_name AS client_name, cl.phone AS client_phone
     FROM invoices i
     INNER JOIN contracts c ON c.id = i.contract_id
     INNER JOIN clients cl ON cl.id = c.client_id
     ORDER BY i.created_at DESC`
  );

  res.json({ success: true, data: invoices });
}

async function listUnpaidInvoices(req, res) {
  const invoices = await query('SELECT * FROM vw_unpaid_invoices ORDER BY due_date ASC');
  res.json({ success: true, data: invoices });
}

async function createMonthlyInvoice(req, res) {
  const {
    contractId,
    periodStart,
    periodEnd,
    dueDate,
    invoiceType = 'facture',
    status = 'non_reglee',
    equipmentInstallmentAmountUsd = 0,
    discountAmountUsd = 0
  } = req.body;

  if (!contractId || !periodStart || !periodEnd || !dueDate) {
    throw new HttpError(400, 'Contrat, periode et date echeance sont obligatoires');
  }

  const connection = await getConnection();

  try {
    await connection.execute('SET @invoice_id = NULL');
    await connection.execute('CALL sp_create_monthly_invoice(?, ?, ?, ?, ?, ?, @invoice_id)', [
      contractId,
      periodStart,
      periodEnd,
      dueDate,
      equipmentInstallmentAmountUsd,
      discountAmountUsd
    ]);
    const [[result]] = await connection.execute('SELECT @invoice_id AS invoiceId');
    await connection.execute(
      `UPDATE invoices
       SET invoice_type = ?, status = ?
       WHERE id = ?`,
      [invoiceType, status, result.invoiceId]
    );

    res.status(201).json({ success: true, data: result });
  } finally {
    connection.release();
  }
}

async function markLateInvoices(req, res) {
  await query('CALL sp_mark_late_invoices()');
  res.json({ success: true, message: 'Factures en retard mises a jour' });
}

module.exports = {
  listInvoices,
  listUnpaidInvoices,
  createMonthlyInvoice,
  markLateInvoices
};

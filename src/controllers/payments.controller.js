const { getConnection, query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listPayments(req, res) {
  const payments = await query(
    `SELECT
       p.*,
       cl.full_name AS client_name,
       cl.phone AS client_phone,
       c.contract_number,
       i.invoice_number,
       i.total_amount_usd AS invoice_total_amount_usd,
       i.status AS invoice_status,
       i.period_start,
       i.period_end,
       i.due_date
     FROM payments p
     INNER JOIN clients cl ON cl.id = p.client_id
     INNER JOIN contracts c ON c.id = p.contract_id
     LEFT JOIN invoices i ON i.id = p.invoice_id
     ORDER BY p.paid_at DESC`
  );

  res.json({ success: true, data: payments });
}

async function registerPayment(req, res) {
  const {
    invoiceId,
    amountUsd,
    method,
    transactionNumber
  } = req.body;

  if (!invoiceId || !amountUsd || !method) {
    throw new HttpError(400, 'Facture, montant et methode de paiement sont obligatoires');
  }

  const connection = await getConnection();

  try {
    await connection.execute('SET @payment_id = NULL');
    await connection.execute('CALL sp_register_payment(?, ?, ?, ?, ?, @payment_id)', [
      invoiceId,
      amountUsd,
      method,
      transactionNumber || null,
      req.user?.id || null
    ]);
    const [[result]] = await connection.execute('SELECT @payment_id AS paymentId');

    res.status(201).json({ success: true, data: result });
  } finally {
    connection.release();
  }
}

module.exports = {
  listPayments,
  registerPayment
};

const { getConnection, query } = require('../config/database');
const HttpError = require('../utils/http-error');

const allowedMethods = new Set(['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']);

async function refreshInvoiceStatus(connection, invoiceId) {
  if (!invoiceId) return;

  const [[invoice]] = await connection.execute(
    `SELECT
       i.total_amount_usd,
       COALESCE(SUM(p.amount_usd), 0.00) AS total_paid
     FROM invoices i
     LEFT JOIN payments p ON p.invoice_id = i.id
     WHERE i.id = ?
     GROUP BY i.id`,
    [invoiceId]
  );

  if (!invoice) return;

  if (Number(invoice.total_paid) >= Number(invoice.total_amount_usd)) {
    await connection.execute('UPDATE invoices SET status = ? WHERE id = ?', ['payee', invoiceId]);
  } else if (Number(invoice.total_paid) > 0) {
    await connection.execute('UPDATE invoices SET status = ? WHERE id = ?', ['partielle', invoiceId]);
  } else {
    await connection.execute('UPDATE invoices SET status = ? WHERE id = ?', ['non_reglee', invoiceId]);
  }
}

async function listPayments(req, res) {
  const payments = await query(
    `SELECT
       p.*,
       cl.full_name AS client_name,
       cl.phone AS client_phone,
       c.contract_number,
       i.invoice_number,
       i.invoice_type,
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
    transactionNumber,
    paidAt,
    notes
  } = req.body;

  if (!invoiceId || !amountUsd || !method) {
    throw new HttpError(400, 'Facture, montant et methode de paiement sont obligatoires');
  }

  if (!allowedMethods.has(method)) {
    throw new HttpError(400, 'Methode de paiement invalide');
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
    const updateFields = [];
    const updateValues = [];
    if (paidAt) {
      updateFields.push('paid_at = ?');
      updateValues.push(paidAt);
    }
    if (notes) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }
    if (updateFields.length > 0) {
      await connection.execute(`UPDATE payments SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, result.paymentId]);
    }

    res.status(201).json({ success: true, data: result });
  } finally {
    connection.release();
  }
}

async function updatePayment(req, res) {
  const { id } = req.params;
  const { amountUsd, method, transactionNumber, paidAt, notes } = req.body;
  const fields = [];
  const values = [];

  if (amountUsd !== undefined) {
    fields.push('amount_usd = ?');
    values.push(Number(amountUsd || 0));
  }
  if (method !== undefined) {
    if (!allowedMethods.has(method)) throw new HttpError(400, 'Methode de paiement invalide');
    fields.push('method = ?');
    values.push(method);
  }
  if (transactionNumber !== undefined) {
    fields.push('transaction_number = ?');
    values.push(transactionNumber || null);
  }
  if (paidAt !== undefined) {
    fields.push('paid_at = ?');
    values.push(paidAt);
  }
  if (notes !== undefined) {
    fields.push('notes = ?');
    values.push(notes || null);
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'Aucune modification envoyee');
  }

  const connection = await getConnection();

  try {
    const [[payment]] = await connection.execute('SELECT invoice_id FROM payments WHERE id = ?', [id]);
    if (!payment) throw new HttpError(404, 'Paiement introuvable');

    await connection.execute(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    await refreshInvoiceStatus(connection, payment.invoice_id);

    res.json({ success: true, message: 'Paiement modifie' });
  } finally {
    connection.release();
  }
}

async function deletePayment(req, res) {
  const connection = await getConnection();

  try {
    const [[payment]] = await connection.execute('SELECT invoice_id FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) throw new HttpError(404, 'Paiement introuvable');

    await connection.execute('DELETE FROM payments WHERE id = ?', [req.params.id]);
    await refreshInvoiceStatus(connection, payment.invoice_id);

    res.json({ success: true, message: 'Paiement supprime' });
  } finally {
    connection.release();
  }
}

module.exports = {
  listPayments,
  registerPayment,
  updatePayment,
  deletePayment
};

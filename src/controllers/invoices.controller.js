const { getConnection, query } = require('../config/database');
const HttpError = require('../utils/http-error');

const allowedInvoiceTypes = new Set(['facture', 'proforma', 'avoir']);
const allowedInvoiceStatuses = new Set(['brouillon', 'non_reglee', 'emise', 'payee', 'partielle', 'en_retard', 'annulee']);

function nullableAmount(value) {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

function amountOrZero(value) {
  const amount = nullableAmount(value);
  return amount === null || Number.isNaN(amount) ? 0 : amount;
}

async function listInvoices(req, res) {
  const invoices = await query(
    `SELECT
       i.*,
       c.contract_number,
       cl.full_name AS client_name,
       cl.phone AS client_phone,
       COALESCE(SUM(p.amount_usd), 0.00) AS paid_amount_usd
     FROM invoices i
     INNER JOIN contracts c ON c.id = i.contract_id
     INNER JOIN clients cl ON cl.id = c.client_id
     LEFT JOIN payments p ON p.invoice_id = i.id
     GROUP BY i.id, c.contract_number, cl.full_name, cl.phone
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
    installationAmountUsd = 0,
    subscriptionAmountUsd,
    equipmentInstallmentAmountUsd,
    penaltyAmountUsd = 0,
    discountAmountUsd = 0
  } = req.body;

  if (!contractId || !periodStart || !periodEnd || !dueDate) {
    throw new HttpError(400, 'Contrat, periode et date echeance sont obligatoires');
  }

  if (!allowedInvoiceTypes.has(invoiceType) || !allowedInvoiceStatuses.has(status)) {
    throw new HttpError(400, 'Type ou statut de facture invalide');
  }

  const connection = await getConnection();

  try {
    await connection.execute('SET @invoice_id = NULL');
    await connection.execute('CALL sp_create_monthly_invoice(?, ?, ?, ?, ?, ?, @invoice_id)', [
      contractId,
      periodStart,
      periodEnd,
      dueDate,
      amountOrZero(equipmentInstallmentAmountUsd),
      discountAmountUsd
    ]);
    const [[result]] = await connection.execute('SELECT @invoice_id AS invoiceId');
    const updateFields = ['invoice_type = ?', 'status = ?', 'installation_amount_usd = ?', 'penalty_amount_usd = ?', 'discount_amount_usd = ?'];
    const updateValues = [
      invoiceType,
      status,
      amountOrZero(installationAmountUsd),
      amountOrZero(penaltyAmountUsd),
      amountOrZero(discountAmountUsd)
    ];
    const subscriptionAmount = nullableAmount(subscriptionAmountUsd);
    if (subscriptionAmount !== null && !Number.isNaN(subscriptionAmount)) {
      updateFields.push('subscription_amount_usd = ?');
      updateValues.push(subscriptionAmount);
    }
    await connection.execute(
      `UPDATE invoices
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      [...updateValues, result.invoiceId]
    );

    res.status(201).json({ success: true, data: result });
  } finally {
    connection.release();
  }
}

async function updateInvoice(req, res) {
  const { id } = req.params;
  const {
    invoiceType,
    status,
    periodStart,
    periodEnd,
    dueDate,
    installationAmountUsd,
    subscriptionAmountUsd,
    equipmentInstallmentAmountUsd,
    penaltyAmountUsd,
    discountAmountUsd
  } = req.body;

  const fields = [];
  const values = [];

  if (invoiceType !== undefined) {
    if (!allowedInvoiceTypes.has(invoiceType)) throw new HttpError(400, 'Type de facture invalide');
    fields.push('invoice_type = ?');
    values.push(invoiceType);
  }
  if (status !== undefined) {
    if (!allowedInvoiceStatuses.has(status)) throw new HttpError(400, 'Statut de facture invalide');
    fields.push('status = ?');
    values.push(status);
  }
  if (periodStart !== undefined) {
    fields.push('period_start = ?');
    values.push(periodStart);
  }
  if (periodEnd !== undefined) {
    fields.push('period_end = ?');
    values.push(periodEnd);
  }
  if (dueDate !== undefined) {
    fields.push('due_date = ?');
    values.push(dueDate);
  }

  const amountFields = [
    ['installation_amount_usd', installationAmountUsd],
    ['subscription_amount_usd', subscriptionAmountUsd],
    ['equipment_installment_amount_usd', equipmentInstallmentAmountUsd],
    ['penalty_amount_usd', penaltyAmountUsd],
    ['discount_amount_usd', discountAmountUsd]
  ];

  for (const [column, value] of amountFields) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(amountOrZero(value));
    }
  }

  if (fields.length === 0) {
    throw new HttpError(400, 'Aucune modification envoyee');
  }

  values.push(id);
  const result = await query(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, values);

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Facture introuvable');
  }

  res.json({ success: true, message: 'Facture modifiee' });
}

async function deleteInvoice(req, res) {
  const result = await query('DELETE FROM invoices WHERE id = ?', [req.params.id]);

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Facture introuvable');
  }

  res.json({ success: true, message: 'Facture supprimee' });
}

async function markLateInvoices(req, res) {
  await query('CALL sp_mark_late_invoices()');
  res.json({ success: true, message: 'Factures en retard mises a jour' });
}

module.exports = {
  listInvoices,
  listUnpaidInvoices,
  createMonthlyInvoice,
  updateInvoice,
  deleteInvoice,
  markLateInvoices
};

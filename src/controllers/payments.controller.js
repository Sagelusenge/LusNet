const { getConnection, query } = require('../config/database');
const HttpError = require('../utils/http-error');

const allowedMethods = new Set(['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']);

function budgetDate(value) {
  return value ? String(value).replace('T', ' ').slice(0, 10) : new Date().toISOString().slice(0, 10);
}

async function getSubscriberPaymentCategoryId(connection) {
  const [[existing]] = await connection.execute(
    'SELECT id FROM budget_categories WHERE name = ? AND type = ? LIMIT 1',
    ['Paiement abonnes', 'recette']
  );

  if (existing) return existing.id;

  const [result] = await connection.execute(
    'INSERT INTO budget_categories (name, type, description) VALUES (?, ?, ?)',
    ['Paiement abonnes', 'recette', 'Paiements mensuels des clients abonnes']
  );

  return result.insertId;
}

async function getPaymentBudgetPayload(connection, paymentId) {
  const [[payment]] = await connection.execute(
    `SELECT
       p.id,
       p.payment_reference,
       p.amount_usd,
       p.paid_at,
       p.method,
       p.transaction_number,
       p.notes,
       p.received_by,
       cl.full_name AS client_name,
       i.invoice_number
     FROM payments p
     INNER JOIN clients cl ON cl.id = p.client_id
     LEFT JOIN invoices i ON i.id = p.invoice_id
     WHERE p.id = ?`,
    [paymentId]
  );

  return payment;
}

async function syncPaymentBudgetEntry(connection, paymentId) {
  const payment = await getPaymentBudgetPayload(connection, paymentId);
  if (!payment) return;

  const categoryId = await getSubscriberPaymentCategoryId(connection);
  const title = `Paiement client - ${payment.client_name}`;
  const notes = [
    payment.invoice_number ? `Facture: ${payment.invoice_number}` : '',
    payment.transaction_number ? `Transaction: ${payment.transaction_number}` : '',
    payment.notes || ''
  ].filter(Boolean).join(' | ') || null;

  const [[existing]] = await connection.execute(
    'SELECT id FROM budget_entries WHERE entry_type = ? AND reference = ? LIMIT 1',
    ['recette', payment.payment_reference]
  );

  if (existing) {
    await connection.execute(
      `UPDATE budget_entries
       SET category_id = ?,
           title = ?,
           amount_usd = ?,
           entry_date = ?,
           payment_method = ?,
           notes = ?,
           created_by = COALESCE(created_by, ?)
       WHERE id = ?`,
      [categoryId, title, payment.amount_usd, budgetDate(payment.paid_at), payment.method, notes, payment.received_by || null, existing.id]
    );
  } else {
    await connection.execute(
      `INSERT INTO budget_entries (
        entry_type, category_id, title, amount_usd, entry_date, payment_method, reference, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['recette', categoryId, title, payment.amount_usd, budgetDate(payment.paid_at), payment.method, payment.payment_reference, notes, payment.received_by || null]
    );
  }
}

async function deletePaymentBudgetEntry(connection, paymentReference) {
  if (!paymentReference) return;
  await connection.execute(
    'DELETE FROM budget_entries WHERE entry_type = ? AND reference = ?',
    ['recette', paymentReference]
  );
}

function equipmentPaymentMarker(paymentReference) {
  return `Paiement materiel: ${paymentReference}`;
}

function calculateEquipmentAllocation({
  paymentAmount,
  invoiceEquipmentAmount,
  invoiceEquipmentAlreadyAllocated,
  contractEquipmentRemaining,
  isEquipmentPayment
}) {
  const paid = Math.max(Number(paymentAmount) || 0, 0);
  const invoiceEquipment = Math.max(Number(invoiceEquipmentAmount) || 0, 0);
  const alreadyAllocated = Math.max(Number(invoiceEquipmentAlreadyAllocated) || 0, 0);
  const contractRemaining = Math.max(Number(contractEquipmentRemaining) || 0, 0);

  if (paid <= 0 || contractRemaining <= 0) return 0;

  const requested = invoiceEquipment > 0
    ? Math.min(paid, Math.max(invoiceEquipment - alreadyAllocated, 0))
    : (isEquipmentPayment ? paid : 0);

  return Math.min(requested, contractRemaining);
}

async function unlinkEquipmentInstallmentPayment(connection, paymentReference) {
  if (!paymentReference) return;
  const marker = equipmentPaymentMarker(paymentReference);

  await connection.execute(
    `UPDATE equipment_installments
     SET status = CASE WHEN due_date < CURRENT_DATE THEN 'en_retard' ELSE 'a_payer' END,
         paid_at = NULL,
         notes = NULLIF(TRIM(REPLACE(COALESCE(notes, ''), ?, '')), '')
     WHERE notes LIKE ?`,
    [marker, `%${marker}%`]
  );
}

async function syncEquipmentInstallmentPayment(connection, paymentId, isEquipmentPayment = false) {
  const [[payment]] = await connection.execute(
    `SELECT
       p.payment_reference,
       p.contract_id,
       p.invoice_id,
       p.amount_usd,
       p.paid_at,
       COALESCE(i.installation_amount_usd, 0.00)
         + COALESCE(i.equipment_installment_amount_usd, 0.00) AS invoice_equipment_amount_usd
     FROM payments p
     LEFT JOIN invoices i ON i.id = p.invoice_id
     WHERE p.id = ?`,
    [paymentId]
  );

  if (!payment) return;

  await unlinkEquipmentInstallmentPayment(connection, payment.payment_reference);

  const invoiceEquipmentAmount = Number(payment.invoice_equipment_amount_usd || 0);
  const shouldSync = Boolean(isEquipmentPayment) || invoiceEquipmentAmount > 0;
  if (!shouldSync) return;

  const [[invoiceAllocation]] = payment.invoice_id
    ? await connection.execute(
      `SELECT COALESCE(SUM(ei.amount_usd), 0.00) AS allocated_usd
       FROM equipment_installments ei
       INNER JOIN payments linked_payment
         ON linked_payment.contract_id = ei.contract_id
        AND ei.notes LIKE CONCAT('%Paiement materiel: ', linked_payment.payment_reference, '%')
       WHERE linked_payment.invoice_id = ?
         AND linked_payment.id <> ?
         AND ei.status = 'payee'`,
      [payment.invoice_id, paymentId]
    )
    : [[{ allocated_usd: 0 }]];

  const [[equipmentBalance]] = await connection.execute(
    `SELECT
       COALESCE(c.equipment_total_price_usd, 100.00) AS equipment_total_usd,
       COALESCE(SUM(CASE WHEN ei.status = 'payee' THEN ei.amount_usd ELSE 0 END), 0.00) AS equipment_paid_usd
     FROM contracts c
     LEFT JOIN equipment_installments ei ON ei.contract_id = c.id
     WHERE c.id = ?
     GROUP BY c.id, c.equipment_total_price_usd`,
    [payment.contract_id]
  );

  const remaining = Number(equipmentBalance?.equipment_total_usd || 100) - Number(equipmentBalance?.equipment_paid_usd || 0);
  const amount = calculateEquipmentAllocation({
    paymentAmount: payment.amount_usd,
    invoiceEquipmentAmount,
    invoiceEquipmentAlreadyAllocated: invoiceAllocation?.allocated_usd,
    contractEquipmentRemaining: remaining,
    isEquipmentPayment
  });
  if (amount <= 0) return;

  const paidAt = String(payment.paid_at || '').slice(0, 10) || null;
  const marker = equipmentPaymentMarker(payment.payment_reference);

  const [[installment]] = await connection.execute(
    `SELECT id
     FROM equipment_installments
     WHERE contract_id = ?
       AND status IN ('a_payer', 'en_retard')
       AND COALESCE(notes, '') NOT LIKE ?
     ORDER BY
       CASE WHEN status = 'payee' THEN 1 ELSE 0 END ASC,
       ABS(amount_usd - ?) ASC,
       due_date ASC,
       id ASC
     LIMIT 1`,
    [payment.contract_id, `%${marker}%`, amount]
  );

  if (installment) {
    await connection.execute(
      `UPDATE equipment_installments
       SET status = 'payee',
           amount_usd = ?,
           paid_at = COALESCE(?, CURRENT_DATE),
           notes = TRIM(CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE ' | ' END, ?))
       WHERE id = ?`,
      [amount, paidAt, marker, installment.id]
    );
    return;
  }

  const [[numberRow]] = await connection.execute(
    'SELECT COALESCE(MAX(installment_number), 0) + 1 AS next_number FROM equipment_installments WHERE contract_id = ?',
    [payment.contract_id]
  );

  await connection.execute(
    `INSERT INTO equipment_installments (contract_id, installment_number, amount_usd, due_date, paid_at, status, notes)
     VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE), COALESCE(?, CURRENT_DATE), 'payee', ?)`,
    [payment.contract_id, numberRow.next_number, amount, paidAt, paidAt, marker]
  );
}

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
       i.due_date,
       COALESCE(i.equipment_installment_amount_usd, 0.00) AS equipment_installment_amount_usd,
       EXISTS (
         SELECT 1
         FROM equipment_installments ei
         WHERE ei.contract_id = p.contract_id
           AND ei.notes LIKE CONCAT('%Paiement materiel: ', p.payment_reference, '%')
       ) AS is_equipment_payment
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
    notes,
    isEquipmentPayment = false
  } = req.body;

  const paymentAmount = Number(amountUsd);

  if (!invoiceId || !method || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new HttpError(400, 'Facture, montant et methode de paiement sont obligatoires');
  }

  if (!allowedMethods.has(method)) {
    throw new HttpError(400, 'Methode de paiement invalide');
  }

  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute('SET @payment_id = NULL');
    await connection.execute('CALL sp_register_payment(?, ?, ?, ?, ?, @payment_id)', [
      invoiceId,
      paymentAmount,
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
    await refreshInvoiceStatus(connection, invoiceId);
    await syncPaymentBudgetEntry(connection, result.paymentId);
    await syncEquipmentInstallmentPayment(connection, result.paymentId, isEquipmentPayment);

    await connection.commit();
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updatePayment(req, res) {
  const { id } = req.params;
  const { amountUsd, method, transactionNumber, paidAt, notes, isEquipmentPayment } = req.body;
  const fields = [];
  const values = [];

  if (amountUsd !== undefined) {
    const paymentAmount = Number(amountUsd);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new HttpError(400, 'Le montant du paiement doit etre superieur a zero');
    }
    fields.push('amount_usd = ?');
    values.push(paymentAmount);
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
    await connection.beginTransaction();
    const [[payment]] = await connection.execute('SELECT invoice_id FROM payments WHERE id = ?', [id]);
    if (!payment) throw new HttpError(404, 'Paiement introuvable');

    await connection.execute(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    await refreshInvoiceStatus(connection, payment.invoice_id);
    await syncPaymentBudgetEntry(connection, id);
    await syncEquipmentInstallmentPayment(connection, id, isEquipmentPayment);

    await connection.commit();
    res.json({ success: true, message: 'Paiement modifie' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deletePayment(req, res) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    const [[payment]] = await connection.execute('SELECT invoice_id, payment_reference FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) throw new HttpError(404, 'Paiement introuvable');

    await unlinkEquipmentInstallmentPayment(connection, payment.payment_reference);
    await connection.execute('DELETE FROM payments WHERE id = ?', [req.params.id]);
    await deletePaymentBudgetEntry(connection, payment.payment_reference);
    await refreshInvoiceStatus(connection, payment.invoice_id);

    await connection.commit();
    res.json({ success: true, message: 'Paiement supprime' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listPayments,
  registerPayment,
  updatePayment,
  deletePayment,
  calculateEquipmentAllocation
};

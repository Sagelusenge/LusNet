const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listKits(req, res) {
  const rows = await query('SELECT * FROM equipment_kits ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}

async function createKit(req, res) {
  const { name, description, totalPriceUsd = 100, isActive = true } = req.body;

  if (!name) throw new HttpError(400, 'Le nom du kit est obligatoire');

  const result = await query(
    `INSERT INTO equipment_kits (name, description, total_price_usd, is_active)
     VALUES (?, ?, ?, ?)`,
    [name, description || null, totalPriceUsd, isActive]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function assignEquipment(req, res) {
  const {
    contractId,
    equipmentKitId,
    cpeSerialNumber,
    routerSerialNumber,
    installedAt,
    installedBy,
    ownershipStatus = 'propriete_operateur',
    conditionStatus = 'bon',
    notes
  } = req.body;

  if (!contractId || !equipmentKitId) {
    throw new HttpError(400, 'Contrat et kit materiel sont obligatoires');
  }

  const result = await query(
    `INSERT INTO contract_equipment (
      contract_id, equipment_kit_id, cpe_serial_number, router_serial_number,
      installed_at, installed_by, ownership_status, condition_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractId,
      equipmentKitId,
      cpeSerialNumber || null,
      routerSerialNumber || null,
      installedAt || null,
      installedBy || req.user?.id || null,
      ownershipStatus,
      conditionStatus,
      notes || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function listInstallments(req, res) {
  const rows = await query(
    `SELECT ei.*, c.contract_number, cl.full_name AS client_name
     FROM equipment_installments ei
     INNER JOIN contracts c ON c.id = ei.contract_id
     INNER JOIN clients cl ON cl.id = c.client_id
     WHERE (? IS NULL OR ei.contract_id = ?)
     ORDER BY ei.due_date ASC`,
    [req.query.contractId || null, req.query.contractId || null]
  );

  res.json({ success: true, data: rows });
}

async function createInstallment(req, res) {
  const { contractId, installmentNumber, amountUsd, dueDate, notes } = req.body;

  if (!contractId || !installmentNumber || !amountUsd || !dueDate) {
    throw new HttpError(400, 'Contrat, numero tranche, montant et echeance sont obligatoires');
  }

  const result = await query(
    `INSERT INTO equipment_installments (contract_id, installment_number, amount_usd, due_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [contractId, installmentNumber, amountUsd, dueDate, notes || null]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function markInstallmentPaid(req, res) {
  await query(
    `UPDATE equipment_installments
     SET status = 'payee', paid_at = COALESCE(?, CURRENT_DATE)
     WHERE id = ?`,
    [req.body.paidAt || null, req.params.id]
  );

  res.json({ success: true, message: 'Tranche materiel marquee comme payee' });
}

module.exports = {
  listKits,
  createKit,
  assignEquipment,
  listInstallments,
  createInstallment,
  markInstallmentPaid
};

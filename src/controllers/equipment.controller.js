const net = require('node:net');
const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listKits(req, res) {
  const rows = await query(
    `SELECT
       ek.*,
       COUNT(ce.id) AS assigned_count,
       GREATEST(COALESCE(ek.stock_quantity, 0) - COUNT(ce.id), 0) AS available_count
     FROM equipment_kits ek
     LEFT JOIN contract_equipment ce ON ce.equipment_kit_id = ek.id
     GROUP BY ek.id, ek.name, ek.description, ek.total_price_usd, ek.stock_quantity, ek.is_active, ek.created_at, ek.updated_at
     ORDER BY ek.created_at DESC`
  );
  res.json({ success: true, data: rows });
}

async function createKit(req, res) {
  const { name, description, totalPriceUsd = 100, stockQuantity = 0, isActive = true } = req.body;

  if (!name) throw new HttpError(400, 'Le nom du kit est obligatoire');

  const result = await query(
    `INSERT INTO equipment_kits (name, description, total_price_usd, stock_quantity, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [name, description || null, totalPriceUsd, Number(stockQuantity || 0), isActive]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

function validateNetworkIdentity(ipAddress, macAddress) {
  if (!ipAddress || net.isIP(String(ipAddress).trim()) === 0) {
    throw new HttpError(400, 'Une adresse IP valide est obligatoire');
  }

  if (macAddress && !/^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i.test(String(macAddress).trim())) {
    throw new HttpError(400, 'Adresse MAC invalide');
  }
}

async function ensureIpAvailable(ipAddress, excludedId = null) {
  const rows = await query(
    `SELECT id FROM contract_equipment
     WHERE ip_address = ? AND (? IS NULL OR id <> ?)
     LIMIT 1`,
    [ipAddress, excludedId, excludedId]
  );

  if (rows.length > 0) {
    throw new HttpError(409, 'Cette adresse IP est deja affectee');
  }
}

async function listAssignments(req, res) {
  const rows = await query(
    `SELECT ce.*, c.contract_number, c.status AS contract_status, c.activated_at,
            cl.id AS client_id, cl.client_code, cl.full_name AS client_name, cl.phone AS client_phone,
            ip.name AS plan_name, ek.name AS kit_name
     FROM contract_equipment ce
     INNER JOIN contracts c ON c.id = ce.contract_id
     INNER JOIN clients cl ON cl.id = c.client_id
     INNER JOIN internet_plans ip ON ip.id = c.plan_id
     INNER JOIN equipment_kits ek ON ek.id = ce.equipment_kit_id
     ORDER BY cl.full_name ASC, ce.installed_at DESC, ce.id DESC`
  );

  res.json({ success: true, data: rows });
}

async function assignEquipment(req, res) {
  const {
    contractId,
    equipmentKitId,
    equipmentName,
    cpeSerialNumber,
    routerSerialNumber,
    ipAddress,
    macAddress,
    installedAt,
    installedBy,
    ownershipStatus = 'propriete_operateur',
    conditionStatus = 'bon',
    notes
  } = req.body;

  if (!contractId || !equipmentKitId || !equipmentName) {
    throw new HttpError(400, 'Contrat, kit et nom de l equipement sont obligatoires');
  }

  const normalizedIp = String(ipAddress || '').trim();
  const normalizedMac = macAddress ? String(macAddress).trim().toUpperCase().replace(/-/g, ':') : null;
  validateNetworkIdentity(normalizedIp, normalizedMac);
  await ensureIpAvailable(normalizedIp);

  const result = await query(
    `INSERT INTO contract_equipment (
      contract_id, equipment_kit_id, equipment_name, cpe_serial_number, router_serial_number,
      ip_address, mac_address, installed_at, installed_by, ownership_status, condition_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractId,
      equipmentKitId,
      equipmentName,
      cpeSerialNumber || null,
      routerSerialNumber || null,
      normalizedIp,
      normalizedMac,
      installedAt || null,
      installedBy || req.user?.id || null,
      ownershipStatus,
      conditionStatus,
      notes || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateAssignment(req, res) {
  const {
    contractId,
    equipmentKitId,
    equipmentName,
    cpeSerialNumber,
    routerSerialNumber,
    ipAddress,
    macAddress,
    installedAt,
    ownershipStatus = 'propriete_operateur',
    conditionStatus = 'bon',
    notes
  } = req.body;

  if (!contractId || !equipmentKitId || !equipmentName) {
    throw new HttpError(400, 'Contrat, kit et nom de l equipement sont obligatoires');
  }

  const normalizedIp = String(ipAddress || '').trim();
  const normalizedMac = macAddress ? String(macAddress).trim().toUpperCase().replace(/-/g, ':') : null;
  validateNetworkIdentity(normalizedIp, normalizedMac);
  await ensureIpAvailable(normalizedIp, req.params.id);

  const result = await query(
    `UPDATE contract_equipment
     SET contract_id = ?, equipment_kit_id = ?, equipment_name = ?,
         cpe_serial_number = ?, router_serial_number = ?, ip_address = ?, mac_address = ?,
         installed_at = ?, ownership_status = ?, condition_status = ?, notes = ?
     WHERE id = ?`,
    [
      contractId,
      equipmentKitId,
      equipmentName,
      cpeSerialNumber || null,
      routerSerialNumber || null,
      normalizedIp,
      normalizedMac,
      installedAt || null,
      ownershipStatus,
      conditionStatus,
      notes || null,
      req.params.id
    ]
  );

  if (result.affectedRows === 0) throw new HttpError(404, 'Affectation materiel introuvable');
  res.json({ success: true, message: 'Affectation materiel mise a jour' });
}

async function deleteAssignment(req, res) {
  const result = await query('DELETE FROM contract_equipment WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Affectation materiel introuvable');
  res.json({ success: true, message: 'Affectation materiel supprimee' });
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

  const balances = await query(
    `SELECT
       COALESCE(c.equipment_total_price_usd, 100.00) AS equipment_total_usd,
       COALESCE(SUM(CASE WHEN ei.status = 'payee' THEN ei.amount_usd ELSE 0 END), 0.00) AS equipment_paid_usd
     FROM contracts c
     LEFT JOIN equipment_installments ei ON ei.contract_id = c.id
     WHERE c.id = ?
     GROUP BY c.id, c.equipment_total_price_usd`,
    [contractId]
  );

  if (!balances[0]) throw new HttpError(404, 'Contrat introuvable');

  const remaining = Number(balances[0].equipment_total_usd || 100) - Number(balances[0].equipment_paid_usd || 0);
  if (remaining <= 0) {
    throw new HttpError(400, 'Le kit de ce client est deja totalement paye');
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
  listAssignments,
  assignEquipment,
  updateAssignment,
  deleteAssignment,
  listInstallments,
  createInstallment,
  markInstallmentPaid
};

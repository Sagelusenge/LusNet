const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

function generateContractNumber() {
  return `CTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-5)}`;
}

function normalizeDueDay(value) {
  const dueDay = Number(value);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new HttpError(400, 'Le jour du mois pour payer doit etre entre 1 et 31');
  }
  return dueDay;
}

async function listContracts(req, res) {
  const rows = await query(
    `SELECT
       vc.*,
       COALESCE((
         SELECT SUM(TIMESTAMPDIFF(SECOND, ss.suspended_at, ss.restored_at))
         FROM service_suspensions ss
         WHERE ss.contract_id = vc.contract_id
           AND ss.restored_at IS NOT NULL
       ), 0) AS completed_suspension_seconds,
       CASE
         WHEN vc.status = 'suspendu' THEN COALESCE((
           SELECT MAX(ss.suspended_at)
           FROM service_suspensions ss
           WHERE ss.contract_id = vc.contract_id
             AND ss.restored_at IS NULL
         ), c.updated_at)
         ELSE NULL
       END AS current_suspended_at
     FROM vw_active_contracts vc
     INNER JOIN contracts c ON c.id = vc.contract_id
     ORDER BY vc.activated_at DESC, vc.contract_id DESC`
  );
  res.json({ success: true, data: rows });
}

async function getContractState(contractId) {
  const rows = await query('SELECT id, status, updated_at FROM contracts WHERE id = ? LIMIT 1', [contractId]);
  if (!rows[0]) throw new HttpError(404, 'Contrat introuvable');
  return rows[0];
}

async function ensureOpenSuspension(contract, createdBy = null, notes = null) {
  const rows = await query(
    'SELECT id FROM service_suspensions WHERE contract_id = ? AND restored_at IS NULL LIMIT 1',
    [contract.id]
  );
  if (rows[0]) return;

  await query(
    `INSERT INTO service_suspensions (contract_id, reason, suspended_at, notes, created_by)
     VALUES (?, 'autre', ?, ?, ?)`,
    [contract.id, contract.updated_at || new Date(), notes || 'Suspension existante regularisee automatiquement', createdBy]
  );
}

async function transitionContractStatus(contractId, nextStatus, userId = null, notes = null, reason = 'impaye') {
  const contract = await getContractState(contractId);
  if (!nextStatus || nextStatus === contract.status) return contract.status;

  if (nextStatus === 'suspendu') {
    await query('CALL sp_suspend_contract(?, ?, ?, ?)', [contractId, reason, notes, userId]);
    return nextStatus;
  }

  if (contract.status === 'suspendu') {
    await ensureOpenSuspension(contract, userId, notes);
    await query('CALL sp_restore_contract(?, ?)', [contractId, notes]);
    if (nextStatus !== 'actif') {
      await query('UPDATE contracts SET status = ? WHERE id = ?', [nextStatus, contractId]);
    }
    return nextStatus;
  }

  await query('UPDATE contracts SET status = ? WHERE id = ?', [nextStatus, contractId]);
  return nextStatus;
}

async function getContract(req, res) {
  const rows = await query('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Contrat introuvable');
  res.json({ success: true, data: rows[0] });
}

async function createContract(req, res) {
  const {
    contractNumber,
    clientId,
    planId,
    status = 'brouillon',
    signedAt,
    activatedAt,
    trialEndsAt,
    minimumCommitmentMonths,
    billingDueDay,
    otherPriceUsd,
    equipmentTotalPriceUsd = 100,
    equipmentInitialPaymentUsd,
    equipmentMonthlyPaymentUsd,
    equipmentPaidInFull = false,
    installationAddress,
    installationLatitude,
    installationLongitude,
    notes
  } = req.body;

  if (!clientId || !planId || !installationAddress) {
    throw new HttpError(400, 'Client, bouquet et adresse installation sont obligatoires');
  }

  const plans = await query('SELECT name FROM internet_plans WHERE id = ? LIMIT 1', [planId]);
  const isOtherPlan = plans[0]?.name === 'Autre';
  const customMonthlyPriceUsd = isOtherPlan ? Number(otherPriceUsd || 10) : null;
  const equipmentTotal = Number(equipmentTotalPriceUsd || 100);

  if (!Number.isFinite(equipmentTotal) || equipmentTotal <= 0) {
    throw new HttpError(400, 'Le prix total du materiel doit etre superieur a zero');
  }

  const result = await query(
    `INSERT INTO contracts (
      contract_number, client_id, plan_id, status, signed_at, activated_at, trial_ends_at,
      minimum_commitment_months, billing_due_day, custom_plan_name, custom_monthly_price_usd,
      equipment_total_price_usd, equipment_initial_payment_usd, equipment_monthly_payment_usd,
      equipment_paid_in_full, installation_address, installation_latitude, installation_longitude, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractNumber || generateContractNumber(),
      clientId,
      planId,
      status,
      signedAt || null,
      activatedAt || null,
      trialEndsAt || null,
      minimumCommitmentMonths || null,
      normalizeDueDay(billingDueDay || 5),
      isOtherPlan ? 'Autre' : null,
      customMonthlyPriceUsd,
      equipmentTotal,
      Number(equipmentPaidInFull ? equipmentTotal : (equipmentInitialPaymentUsd || 20)),
      equipmentPaidInFull ? null : (equipmentMonthlyPaymentUsd ? Number(equipmentMonthlyPaymentUsd) : null),
      Boolean(equipmentPaidInFull),
      installationAddress,
      installationLatitude || null,
      installationLongitude || null,
      notes || null,
      req.user?.id || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateContractStatus(req, res) {
  const { status } = req.body;
  await transitionContractStatus(req.params.id, status, req.user?.id || null, req.body.notes || null, req.body.reason || 'impaye');
  res.json({ success: true, message: 'Statut du contrat mis a jour' });
}

async function updateContract(req, res) {
  const {
    planId,
    status,
    signedAt,
    activatedAt,
    trialEndsAt,
    minimumCommitmentMonths,
    billingDueDay,
    otherPriceUsd,
    equipmentTotalPriceUsd,
    equipmentInitialPaymentUsd,
    equipmentMonthlyPaymentUsd,
    equipmentPaidInFull,
    installationAddress,
    notes
  } = req.body;

  const contractBeforeUpdate = await getContractState(req.params.id);

  let isOtherPlan = false;
  if (planId) {
    const plans = await query('SELECT name FROM internet_plans WHERE id = ? LIMIT 1', [planId]);
    isOtherPlan = plans[0]?.name === 'Autre';
  }
  const shouldUpdateCustomPlan = Boolean(planId);
  const shouldUpdateEquipmentTotal = typeof equipmentTotalPriceUsd !== 'undefined';
  const equipmentTotal = shouldUpdateEquipmentTotal ? Number(equipmentTotalPriceUsd) : null;

  if (shouldUpdateEquipmentTotal && (!Number.isFinite(equipmentTotal) || equipmentTotal <= 0)) {
    throw new HttpError(400, 'Le prix total du materiel doit etre superieur a zero');
  }

  await query(
    `UPDATE contracts
     SET plan_id = COALESCE(?, plan_id),
         signed_at = COALESCE(?, signed_at),
         activated_at = COALESCE(?, activated_at),
         trial_ends_at = COALESCE(?, trial_ends_at),
         minimum_commitment_months = COALESCE(?, minimum_commitment_months),
         billing_due_day = COALESCE(?, billing_due_day),
         custom_plan_name = CASE WHEN ? THEN ? ELSE custom_plan_name END,
         custom_monthly_price_usd = CASE WHEN ? THEN ? ELSE custom_monthly_price_usd END,
         equipment_total_price_usd = CASE WHEN ? THEN ? ELSE equipment_total_price_usd END,
         equipment_initial_payment_usd = COALESCE(?, equipment_initial_payment_usd),
         equipment_monthly_payment_usd = CASE WHEN ? THEN ? ELSE equipment_monthly_payment_usd END,
         equipment_paid_in_full = COALESCE(?, equipment_paid_in_full),
         installation_address = COALESCE(?, installation_address),
         notes = COALESCE(?, notes)
     WHERE id = ?`,
    [
      planId || null,
      signedAt || null,
      activatedAt || null,
      trialEndsAt || null,
      minimumCommitmentMonths || null,
      billingDueDay ? normalizeDueDay(billingDueDay) : null,
      shouldUpdateCustomPlan,
      isOtherPlan ? 'Autre' : null,
      shouldUpdateCustomPlan,
      isOtherPlan ? Number(otherPriceUsd || 10) : null,
      shouldUpdateEquipmentTotal,
      equipmentTotal,
      equipmentInitialPaymentUsd ? Number(equipmentInitialPaymentUsd) : null,
      typeof equipmentMonthlyPaymentUsd !== 'undefined',
      equipmentMonthlyPaymentUsd ? Number(equipmentMonthlyPaymentUsd) : null,
      typeof equipmentPaidInFull === 'boolean' ? equipmentPaidInFull : null,
      installationAddress || null,
      notes || null,
      req.params.id
    ]
  );

  if (status && status !== contractBeforeUpdate.status) {
    await transitionContractStatus(req.params.id, status, req.user?.id || null, notes || null);
  }

  res.json({ success: true, message: 'Contrat mis a jour' });
}

async function deleteContract(req, res) {
  await query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Contrat supprime' });
}

async function listContractBalances(req, res) {
  const rows = await query('SELECT * FROM vw_contract_balances ORDER BY balance_usd DESC');
  res.json({ success: true, data: rows });
}

async function listEquipmentStatus(req, res) {
  const rows = await query('SELECT * FROM vw_equipment_payment_status ORDER BY equipment_remaining_usd DESC');
  res.json({ success: true, data: rows });
}

async function suspendContract(req, res) {
  const { reason = 'impaye', notes } = req.body;
  await transitionContractStatus(req.params.id, 'suspendu', req.user?.id || null, notes || null, reason);
  res.json({ success: true, message: 'Contrat suspendu' });
}

async function restoreContract(req, res) {
  const { notes } = req.body;
  await transitionContractStatus(req.params.id, 'actif', req.user?.id || null, notes || null);
  res.json({ success: true, message: 'Contrat reactive' });
}

module.exports = {
  listContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  updateContractStatus,
  listContractBalances,
  listEquipmentStatus,
  suspendContract,
  restoreContract
};

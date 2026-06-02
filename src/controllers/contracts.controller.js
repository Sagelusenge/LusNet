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
    `SELECT *
     FROM vw_active_contracts
     ORDER BY activated_at DESC, contract_id DESC`
  );
  res.json({ success: true, data: rows });
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
      100,
      Number(equipmentInitialPaymentUsd || (equipmentPaidInFull ? 100 : 20)),
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
  await query('UPDATE contracts SET status = ? WHERE id = ?', [status, req.params.id]);
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
    equipmentInitialPaymentUsd,
    equipmentMonthlyPaymentUsd,
    equipmentPaidInFull,
    installationAddress,
    notes
  } = req.body;

  let isOtherPlan = false;
  if (planId) {
    const plans = await query('SELECT name FROM internet_plans WHERE id = ? LIMIT 1', [planId]);
    isOtherPlan = plans[0]?.name === 'Autre';
  }
  const shouldUpdateCustomPlan = Boolean(planId);

  await query(
    `UPDATE contracts
     SET plan_id = COALESCE(?, plan_id),
         status = COALESCE(?, status),
         signed_at = COALESCE(?, signed_at),
         activated_at = COALESCE(?, activated_at),
         trial_ends_at = COALESCE(?, trial_ends_at),
         minimum_commitment_months = COALESCE(?, minimum_commitment_months),
         billing_due_day = COALESCE(?, billing_due_day),
         custom_plan_name = CASE WHEN ? THEN ? ELSE custom_plan_name END,
         custom_monthly_price_usd = CASE WHEN ? THEN ? ELSE custom_monthly_price_usd END,
         equipment_initial_payment_usd = COALESCE(?, equipment_initial_payment_usd),
         equipment_monthly_payment_usd = CASE WHEN ? THEN ? ELSE equipment_monthly_payment_usd END,
         equipment_paid_in_full = COALESCE(?, equipment_paid_in_full),
         installation_address = COALESCE(?, installation_address),
         notes = COALESCE(?, notes)
     WHERE id = ?`,
    [
      planId || null,
      status || null,
      signedAt || null,
      activatedAt || null,
      trialEndsAt || null,
      minimumCommitmentMonths || null,
      billingDueDay ? normalizeDueDay(billingDueDay) : null,
      shouldUpdateCustomPlan,
      isOtherPlan ? 'Autre' : null,
      shouldUpdateCustomPlan,
      isOtherPlan ? Number(otherPriceUsd || 10) : null,
      equipmentInitialPaymentUsd ? Number(equipmentInitialPaymentUsd) : null,
      typeof equipmentMonthlyPaymentUsd !== 'undefined',
      equipmentMonthlyPaymentUsd ? Number(equipmentMonthlyPaymentUsd) : null,
      typeof equipmentPaidInFull === 'boolean' ? equipmentPaidInFull : null,
      installationAddress || null,
      notes || null,
      req.params.id
    ]
  );

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
  await query('CALL sp_suspend_contract(?, ?, ?, ?)', [req.params.id, reason, notes || null, req.user?.id || null]);
  res.json({ success: true, message: 'Contrat suspendu' });
}

async function restoreContract(req, res) {
  const { notes } = req.body;
  await query('CALL sp_restore_contract(?, ?)', [req.params.id, notes || null]);
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

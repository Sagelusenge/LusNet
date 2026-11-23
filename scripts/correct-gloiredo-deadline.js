// Read-only audit by default. --apply records the correction explicitly requested by the owner.
const { query, pool } = require('../src/config/database');
const { correctDeadline } = require('../src/services/deadline-correction.service');
(async () => {
  const rows = await query(`SELECT c.id, c.contract_number, cl.full_name FROM contracts c JOIN clients cl ON cl.id=c.client_id WHERE c.contract_number=?`, ['CTR-20260602-34488']);
  if (rows.length !== 1 || !/gloiredo/i.test(rows[0].full_name)) throw new Error('Le contrat attendu de Gloiredo est introuvable. Aucune modification.');
  const contract = rows[0];
  const invoices = await query('SELECT id, invoice_type, status, period_start, period_end, subscription_amount_usd FROM invoices WHERE contract_id=? ORDER BY period_end DESC', [contract.id]);
  const suspensions = await query('SELECT suspended_at, restored_at FROM service_suspensions WHERE contract_id=? ORDER BY suspended_at', [contract.id]);
  console.log(JSON.stringify({ contract, invoices, suspensions, correction:'2026-11-06' }, null, 2));
  if (process.argv.includes('--apply')) {
    await correctDeadline(contract.id, { expiresOn:'2026-11-06', reason:'Correction demandée par le responsable le 23/11/2026 : abonnement épuisé depuis le 06/11/2026.' });
    console.log('Correction enregistrée : échéance au 06/11/2026.');
  } else console.log('Audit uniquement. Ajouter --apply pour enregistrer la correction.');
})().catch(error => { console.error(error.message); process.exitCode=1; }).finally(() => pool.end());

const { getConnection } = require('../config/database');
const REPORT_TABLES = [
  ['clients', 'Clients'], ['contracts', 'Contrats'], ['internet_plans', 'Bouquets'],
  ['invoices', 'Factures, proformas et avoirs'], ['payments', 'Paiements'],
  ['budget_categories', 'Catégories budgétaires'], ['budget_entries', 'Recettes et dépenses du budget'],
  ['equipment_kits', 'Kits et stock'], ['contract_equipment', 'Équipements affectés'], ['equipment_installments', 'Échéances et paiements du matériel'],
  ['service_suspensions', 'Suspensions et rétablissements'], ['contract_deadline_corrections', 'Corrections des échéances'],
  ['support_tickets', 'Support et interventions'], ['contract_documents', 'Références des documents'],
  ['quote_requests', 'Demandes de devis'], ['contact_messages', 'Messages de contact'], ['client_feedback', 'Avis clients'],
  ['client_account_requests', 'Demandes de comptes'], ['users', 'Utilisateurs et rôles'],
  ['app_messages', 'Messages internes'], ['app_message_recipients', 'Destinataires et lectures'],
  ['whatsapp_notification_logs', 'Historique WhatsApp'], ['deadline_push_logs', 'Historique des alertes'],
  ['app_push_tokens', 'Appareils enregistrés'], ['web_push_subscriptions', 'Abonnements aux notifications']
];
const SECRET_COLUMN = /password|secret|token|p256dh|endpoint|credential/i;
const cents = value => Math.round(Number(value || 0) * 100);
function monthOf(value) { return /^\d{4}-\d{2}/.test(String(value || '')) ? String(value).slice(0,7) : null; }
function businessSummary(data) {
  const clients = new Map((data.clients || []).map(c => [String(c.id), {
    id:c.id, name:c.full_name || `Client ${c.id}`, contracts:0, total:0, paid:0, remaining:0, unknown:0
  }]));
  const paidByContract = new Map();
  for (const row of data.equipment_installments || []) {
    if (row.status === 'payee') paidByContract.set(String(row.contract_id), (paidByContract.get(String(row.contract_id)) || 0) + cents(row.amount_usd));
  }
  for (const contract of data.contracts || []) {
    const key = String(contract.client_id);
    if (!clients.has(key)) clients.set(key, {id:contract.client_id, name:`Client non référencé (${key})`, contracts:0, total:0, paid:0, remaining:0, unknown:0});
    const client = clients.get(key);
    client.contracts++;
    const paid = paidByContract.get(String(contract.id)) || 0;
    client.paid += paid;
    if (contract.equipment_total_price_usd == null || !Number.isFinite(Number(contract.equipment_total_price_usd))) { client.unknown++; continue; }
    const total = cents(contract.equipment_total_price_usd);
    client.total += total;
    // A surplus on one contract must not erase another contract's outstanding balance.
    client.remaining += Math.max(total - paid, 0);
  }
  const equipment = [...clients.values()].map(c => ({...c, status:
    !c.contracts ? 'Sans contrat' : c.unknown ? 'À vérifier' : c.remaining > 0 ? 'À solder' : c.total > 0 ? 'Soldé' : 'Sans frais matériel'
  }));
  const statuses = table => Object.entries((data[table] || []).reduce((acc,row) => {
    const key=row.status || 'Non renseigné'; acc[key]=(acc[key] || 0)+1; return acc;
  }, {}));
  return {
    equipment,
    equipmentTotals: equipment.reduce((a,c) => { for(const key of ['total','paid','remaining']) a[key]+=c[key]; a[c.status]=(a[c.status] || 0)+1; return a; }, {total:0,paid:0,remaining:0}),
    clientCount:(data.clients || []).length,
    statuses: ['contracts','invoices','support_tickets'].map(table => ({table, rows:statuses(table)}))
  };
}
function summarize(sections, generatedAt = new Date().toISOString()) {
  const data = Object.fromEntries(sections.map(s => [s.table, s.rows]));
  const months = new Map();
  function month(value) {
    const key = monthOf(value); if (!key) return null;
    if (!months.has(key)) months.set(key, { month:key, receipts:0, expenses:0, payments:0, invoiced:0, creditNotes:0, newClients:0, newContracts:0 });
    return months.get(key);
  }
  for (const row of data.clients || []) { const m=month(row.created_at); if(m) m.newClients++; }
  for (const row of data.contracts || []) { const m=month(row.activated_at || row.signed_at || row.created_at); if(m) m.newContracts++; }
  for (const row of data.payments || []) { const m=month(row.paid_at); if(m) m.payments+=cents(row.amount_usd); }
  for (const row of data.budget_entries || []) { const m=month(row.entry_date); if(m) m[row.entry_type === 'recette' ? 'receipts' : 'expenses']+=cents(row.amount_usd); }
  for (const row of data.invoices || []) {
    if (['brouillon','annulee'].includes(row.status) || row.invoice_type === 'proforma') continue;
    const m=month(row.created_at); if(m) m[row.invoice_type === 'avoir' ? 'creditNotes' : 'invoiced']+=cents(row.total_amount_usd);
  }
  const firstMonth=[...months.keys()].sort()[0] || null;
  const lastMonth=[...months.keys(), monthOf(generatedAt)].sort().at(-1);
  if (firstMonth) {
    let [year, mon] = firstMonth.split('-').map(Number);
    for (let count=0; count<2400; count++) {
      const key=`${year}-${String(mon).padStart(2,'0')}`;
      if (key>lastMonth) break;
      month(`${key}-01`);
      if (++mon>12) { mon=1; year++; }
      if (count===2399) throw new Error('Historique supérieur à 200 ans : vérifier les dates saisies.');
    }
  }
  let clients=0, cumulative=0;
  const monthly=[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)).map(m => {
    clients+=m.newClients; cumulative+=m.receipts-m.expenses;
    return { ...m, clients, result:m.receipts-m.expenses, cumulative };
  });
  const totals = monthly.reduce((acc,m) => {
    for (const key of ['receipts','expenses','payments','invoiced','creditNotes','newClients','newContracts','result']) acc[key]=(acc[key]||0)+m[key];
    return acc;
  }, {});
  const missing = sections.filter(s=>s.missing).map(s=>s.title);
  return { business:businessSummary(data), firstMonth, monthly, totals, missing, counts:sections.map(s=>({ title:s.title, count:s.rows.length, missing:s.missing })) };
}
async function collectGlobalReport() {
  const connection=await getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const [schema] = await connection.query('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION');
    const sections=[];
    for (const [table,title] of REPORT_TABLES) {
      const columns=schema.filter(c=>c.TABLE_NAME===table).map(c=>c.COLUMN_NAME).filter(c=>!SECRET_COLUMN.test(c));
      if (!columns.length) { sections.push({ table,title,columns:[],rows:[],missing:true }); continue; }
      const escaped=columns.map(c=>`\`${c.replace(/`/g,'``')}\``).join(',');
      const [rows]=await connection.query(`SELECT ${escaped} FROM \`${table}\`${columns.includes('id') ? ' ORDER BY id' : ''}`);
      sections.push({ table,title,columns,rows,missing:false });
    }
    await connection.commit();
    const generatedAt=new Date().toISOString();
    return { generatedAt, sections, ...summarize(sections,generatedAt) };
  } catch(error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
module.exports={ collectGlobalReport, summarize, REPORT_TABLES, SECRET_COLUMN };

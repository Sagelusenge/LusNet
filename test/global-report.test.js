const test=require('node:test');
const assert=require('node:assert/strict');
const { summarize,SECRET_COLUMN }=require('../src/services/global-report.service');
const section=(table,rows)=>({table,title:table,rows,missing:false});
test('synthèse mensuelle sans double compte et sans mois manquants',()=>{
 const report=summarize([
 section('clients',[{created_at:'2026-01-02'},{created_at:'2026-03-01'}]),
 section('contracts',[{activated_at:'2026-01-03'}]),
 section('payments',[{paid_at:'2026-01-03',amount_usd:20}]),
 section('budget_entries',[{entry_date:'2026-01-03',entry_type:'recette',amount_usd:20},{entry_date:'2026-01-04',entry_type:'depense',amount_usd:8}]),
 section('invoices',[{created_at:'2026-01-02',invoice_type:'facture',status:'payee',total_amount_usd:20},{created_at:'2026-01-02',invoice_type:'proforma',status:'payee',total_amount_usd:500},{created_at:'2026-01-02',invoice_type:'facture',status:'annulee',total_amount_usd:700},{created_at:'2026-01-02',invoice_type:'avoir',status:'emise',total_amount_usd:5}])
 ],'2026-03-23');
 assert.equal(report.firstMonth,'2026-01');assert.equal(report.monthly.length,3);assert.equal(report.monthly[1].result,0);assert.equal(report.totals.result,1200);assert.equal(report.totals.receipts,2000);assert.equal(report.totals.payments,2000);assert.equal(report.totals.invoiced,2000);assert.equal(report.totals.creditNotes,500);assert.equal(report.monthly[2].clients,2);
});
test('les tables absentes sont signalées et les secrets exclus',()=>{
 const report=summarize([{table:'budget_entries',title:'Budget',rows:[],missing:true}]);assert.deepEqual(report.missing,['Budget']);assert.equal(report.firstMonth,null);
 for(const key of ['password_hash','auth_secret','expo_push_token','p256dh','endpoint']) assert.ok(SECRET_COLUMN.test(key));
 assert.ok(!SECRET_COLUMN.test('payment_reference'));
});
test('matériel : clients uniques, paiements réels et soldes par contrat',()=>{
 const report=summarize([
 section('clients',[{id:1,full_name:'Soldé'},{id:2},{id:3},{id:4}]),
 section('contracts',[{id:10,client_id:1,equipment_total_price_usd:100},{id:20,client_id:2,equipment_total_price_usd:100},{id:21,client_id:2,equipment_total_price_usd:50},{id:30,client_id:3}]),
 section('equipment_installments',[{contract_id:10,status:'payee',amount_usd:100},{contract_id:20,status:'payee',amount_usd:150},{contract_id:21,status:'en_attente',amount_usd:50}])
 ],'2026-11-23');
 const e=report.business.equipmentTotals;
 assert.equal(e['Soldé'],1);assert.equal(e['À solder'],1);assert.equal(e['À vérifier'],1);assert.equal(e['Sans contrat'],1);
 assert.equal(e.remaining,5000);assert.equal(e.paid,25000);
 const {REPORT_TABLES}=require('../src/services/global-report.service');
 assert.ok(REPORT_TABLES.every(([table])=>!table.startsWith('ghislain_')));
});

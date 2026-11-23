const test=require('node:test');
const assert=require('node:assert/strict');
const now=new Date('2026-11-23T12:00:00+02:00');
const invoice=(end, overrides={})=>({ id:1, contract_id:1, invoice_type:'facture', status:'payee', period_start:'2026-11-01', period_end:end, subscription_amount_usd:20, total_amount_usd:20, paid_amount_usd:20, ...overrides });
async function countdown(contract,invoices){ const m=await import('../frontend/src/lib/subscriptions.mjs'); return m.subscriptionCountdownForContract({ id:1, activated_at:'2026-05-06', status:'actif',...contract },invoices,now); }
test('les barres utilisent la même échelle quels que soient les mois d’ancienneté', async()=>{
 const a=await countdown({activated_at:'2026-11-02'},[invoice('2026-12-02')]);
 const b=await countdown({activated_at:'2026-09-05'},[invoice('2026-12-05')]);
 const c=await countdown({activated_at:'2026-08-05'},[invoice('2026-12-05')]);
 assert.ok(a.progress<b.progress);assert.equal(b.progress,c.progress);
});
test('ne réapplique pas les suspensions d’anciennes périodes',async()=>{
 const c=await countdown({completed_suspension_seconds:69*86400,suspensions:[{suspended_at:'2026-06-01 00:00:00',restored_at:'2026-08-09 00:00:00'}]},[invoice('2026-11-06')]);
 assert.equal(c.expiresAt.toISOString(),'2026-11-06T21:59:59.000Z');assert.equal(c.days,17);assert.equal(c.progress,0);
});
test('ignore les proformas, avoirs, annulations, factures vides et paiements matériel',async()=>{
 const c=await countdown({},[invoice('2026-11-06'),invoice('2027-01-14',{id:2,invoice_type:'proforma'}),invoice('2027-01-15',{id:3,invoice_type:'avoir'}),invoice('2027-01-16',{id:4,status:'annulee'}),invoice('2027-01-17',{id:5,subscription_amount_usd:0}),invoice('2027-01-18',{id:6,status:'non_reglee',total_amount_usd:0,paid_amount_usd:0})]);
 assert.equal(c.days,17);
});
test('reporte uniquement une interruption pendant la période et fige une suspension en cours',async()=>{
 const c=await countdown({suspensions:[{suspended_at:'2026-11-03 00:00:00',restored_at:'2026-11-05 00:00:00'}]},[invoice('2026-11-06')]);
 assert.equal(c.expiresAt.toISOString().slice(0,10),'2026-11-08');
 const paused=await countdown({status:'suspendu',suspensions:[{suspended_at:'2026-11-03 00:00:00',restored_at:null}]},[invoice('2026-11-06')]);
 assert.equal(paused.isPaused,true);assert.ok(paused.remainingMs>0);
 const expired=await countdown({status:'suspendu',suspensions:[{suspended_at:'2026-11-10 00:00:00',restored_at:null}]},[invoice('2026-11-06')]);assert.equal(expired.isPaused,false);assert.equal(expired.days,17);
});
test('une correction explicite est remplacée par un nouveau renouvellement payé',async()=>{
 const contract={deadline_correction:{expires_on:'2026-11-06',invoice_id_cutoff:2}};
 assert.equal((await countdown(contract,[invoice('2027-01-14',{id:2})])).days,17);
 const renewed=await countdown(contract,[invoice('2027-01-14',{id:2}),invoice('2026-12-06',{id:3,period_start:'2026-11-07'})]);
 assert.equal(renewed.expiresAt.toISOString().slice(0,10),'2026-12-06');
});
test('un paiement nouveau sur une facture déjà créée renouvelle la période corrigée',async()=>{
 const c=await countdown({deadline_correction:{expires_on:'2026-11-06',invoice_id_cutoff:10,payment_id_cutoff:50}},[invoice('2026-12-06',{id:9,last_payment_id:51})]);assert.equal(c.expiresAt.toISOString().slice(0,10),'2026-12-06');
});

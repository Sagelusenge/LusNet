const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const cash = cents => `${(Number(cents || 0)/100).toFixed(2)} USD`;
const monthLabel = month => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('fr-FR',{month:'long',year:'numeric',timeZone:'Africa/Lubumbashi'});
const LABELS = { id:'Identifiant', full_name:'Nom complet', client_id:'Client (ID)', contract_id:'Contrat (ID)', plan_id:'Bouquet (ID)', invoice_id:'Facture (ID)', created_at:'Création', updated_at:'Modification', entry_date:'Date', entry_type:'Type', amount_usd:'Montant USD', total_amount_usd:'Total USD', subscription_amount_usd:'Abonnement USD', installation_amount_usd:'Installation USD', equipment_installment_amount_usd:'Matériel USD', penalty_amount_usd:'Pénalité USD', discount_amount_usd:'Remise USD', name:'Nom', status:'Statut', phone:'Téléphone', address:'Adresse', email:'E-mail', notes:'Notes', title:'Libellé', paid_at:'Payé le', period_start:'Début de période', period_end:'Fin de période', due_date:'Échéance', reference:'Référence', payment_reference:'Référence du paiement', contract_number:'Numéro de contrat', invoice_number:'Numéro de facture', bandwidth_mbps:'Débit Mbps', monthly_price_usd:'Prix mensuel USD', recommended_usage:'Usages', expires_on:'Échéance corrigée', reason:'Motif', activated_at:'Mise en service', method:'Mode de paiement', payment_method:'Mode de paiement', client_code:'Code client', client_type:'Type de client', is_active:'Actif', body:'Message', message:'Message', comment:'Commentaire' };
function renderGlobalReport(report, stream) {
  const doc=new PDFDocument({ size:'A4', margins:{top:48,bottom:48,left:44,right:44}, bufferPages:true, info:{Title:'Rapport global LWASIVA_NET',Author:'LWASIVA_NET'} });
  doc.pipe(stream);
  const width=doc.page.width-88;
  const bottom=()=>doc.page.height-60;
  const ensure=h=>{ if(doc.y+h>bottom()) doc.addPage(); };
  const text=(value,size=10,color='#334155')=>{ doc.font('Helvetica').fontSize(size).fillColor(color).text(String(value),44,doc.y,{width,lineGap:3}); };
  const section=title=>{ ensure(65); doc.moveDown(.8); doc.font('Helvetica-Bold').fontSize(17).fillColor('#00429d').text(title,44,doc.y,{width}); doc.moveDown(.55); };
  const table=(headers,rows,widths)=>{
    const total=widths.reduce((a,b)=>a+b,0); const sizes=widths.map(w=>w/total*width);
    function row(values,head=false) {
      doc.font(head?'Helvetica-Bold':'Helvetica').fontSize(head?8:9);
      const height=Math.max(...values.map((v,i)=>doc.heightOfString(String(v??'-'),{width:sizes[i]-12,lineGap:2})))+14;
      if(doc.y+height>bottom()){ doc.addPage(); if(!head) row(headers,true); }
      const y=doc.y; let x=44;
      values.forEach((v,i)=>{doc.rect(x,y,sizes[i],height).fill(head?'#00429d':'#f1f5fb');doc.fillColor(head?'white':'#0b1c30').text(String(v??'-'),x+6,y+7,{width:sizes[i]-12,lineGap:2});x+=sizes[i];});
      doc.y=y+height+2;doc.x=44;
    }
    row(headers,true);rows.forEach(r=>row(r));doc.moveDown(.5);
  };
  const logo=path.join(__dirname,'../../frontend/public/lwasivanet-logo.jpeg');
  if(fs.existsSync(logo)) { doc.save();doc.rect(44,42,250,64).clip();doc.image(logo,44,42-(250*1086/1448-64)/2,{width:250});doc.restore(); }
  doc.y=126;doc.font('Helvetica-Bold').fontSize(29).fillColor('#0b1c30').text('Rapport global',44,doc.y,{width});
  text('Historique de l’activité et annexes détaillées',14);doc.moveDown();
  text(`Édité le ${new Date(report.generatedAt).toLocaleString('fr-FR',{timeZone:'Africa/Lubumbashi'})} - heure de Goma`,10);
  text(report.firstMonth ? `Premières opérations enregistrées : ${monthLabel(report.firstMonth)}.` : 'Aucune opération datée disponible.');
  text('Cette date correspond aux données conservées dans l’application, pas nécessairement à la création réelle de l’entreprise.');
  section('Synthèse financière');
  const t=report.totals;
  table(['Indicateur','Montant'],[
    ['Recettes enregistrées au budget',cash(t.receipts)],['Dépenses enregistrées au budget',cash(t.expenses)],['Solde de trésorerie du budget (recettes - dépenses)',cash(t.result)],
    ['Paiements clients enregistrés (présentés séparément)',cash(t.payments)],['Factures émises hors brouillons et annulations',cash(t.invoiced)],['Avoirs émis (présentés séparément)',cash(t.creditNotes)],
    ['Livre de caisse Ghislain : entrées',cash(t.cashIn)],['Livre de caisse Ghislain : sorties',cash(t.cashOut)]
  ],[3,2]);
  text('Méthode : les paiements clients, le budget et la caisse Ghislain sont trois journaux distincts. Leurs recettes ne sont jamais additionnées : une même opération peut y figurer plusieurs fois. Le solde du budget est un résultat de trésorerie, pas un bénéfice comptable certifié. Aucun rapprochement automatique n’est supposé.');
  text(`Écart de contrôle entre paiements clients et recettes du budget : ${cash((t.payments||0)-(t.receipts||0))}. Cet écart peut aussi inclure des financements, des décalages ou des écritures manquantes.`);
  text('Le détail inclut les proformas et les factures annulées ; ces documents sont exclus du total facturé. Les montants historiques proviennent des écritures, jamais du tarif actuel des bouquets.');
  if(report.missing.length){section('Données non disponibles');text(`Modules absents de cette base : ${report.missing.join(', ')}. Le rapport ne les assimile pas à un solde nul.`);}
  doc.addPage();section('Évolution mensuelle');
  text('Tous les mois sont présents, y compris ceux sans mouvement. Les mois futurs éventuels correspondent à des dates saisies à vérifier.');
  table(['Mois','Recettes budget','Dépenses budget','Solde du mois','Cumul'],report.monthly.map(m=>[monthLabel(m.month),cash(m.receipts),cash(m.expenses),cash(m.result),cash(m.cumulative)]),[1.4,1,1,1,1]);
  section('Clients, contrats et encaissements');
  text('Clients cumulés = fiches encore présentes créées au plus tard dans le mois ; ce n’est pas le nombre historique d’abonnements actifs. Les contrats sont comptés au mois de mise en service, ou à défaut de signature/création.');
  table(['Mois','Nouveaux clients','Clients cumulés','Contrats démarrés','Paiements clients'],report.monthly.map(m=>[monthLabel(m.month),m.newClients,m.clients,m.newContracts,cash(m.payments)]),[1.4,1,1,1,1.3]);
  doc.addPage();section('Périmètre et inventaire');
  text('Instantané cohérent de la base au moment de l’export, sans limite de lignes. Les identifiants permettent de relier clients, contrats, factures et paiements dans les annexes. Les mots de passe, clés et jetons de sécurité sont exclus. Les documents joints sont référencés, sans incorporer leur contenu. Les données supprimées et l’historique des modifications non conservé ne peuvent pas être reconstitués.');
  table(['Module','Nombre de lignes'],report.counts.map(s=>[s.title,s.missing?'Module absent':s.count]),[4,1]);
  for(const item of report.sections) {
    if (!item.rows.length) continue; // Empty and absent modules remain explicit in the inventory.
    doc.addPage();section(item.title);text(`${item.rows.length} enregistrement(s)${item.missing?' - module absent':''}`);doc.moveDown();
    if(!item.rows.length){text(item.missing?'Ce module n’existe pas dans cette base.':'Aucune donnée enregistrée.');continue;}
    item.rows.forEach((record,index)=>{
      ensure(70);doc.font('Helvetica-Bold').fontSize(11).fillColor('#00429d').text(`${item.title} - ${record.id ?? record.contract_id ?? index+1}`,44,doc.y,{width});doc.moveDown(.3);
      // One full-width field at a time: long notes flow to subsequent pages without truncation.
      for(const column of item.columns){
        const value=record[column];
        if(value==null || value==='')continue;
        ensure(30);doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`${LABELS[column] || column.replace(/_/g,' ')} : ${typeof value==='object'?JSON.stringify(value):value}`,44,doc.y,{width,lineGap:2});
      }
      doc.moveDown(.8);
    });
  }
  const pages=doc.bufferedPageRange();
  for(let i=pages.start;i<pages.start+pages.count;i++){
    doc.switchToPage(i);doc.save();doc.strokeColor('#dce5f1').moveTo(44,doc.page.height-42).lineTo(doc.page.width-44,doc.page.height-42).stroke();
    const oldBottom=doc.page.margins.bottom;doc.page.margins.bottom=0;
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(`LWASIVA_NET - Rapport confidentiel | ${i+1} / ${pages.count}`,44,doc.page.height-32,{width,align:'center',lineBreak:false});
    doc.page.margins.bottom=oldBottom;doc.restore();
  }
  doc.end();return doc;
}
module.exports={ renderGlobalReport };

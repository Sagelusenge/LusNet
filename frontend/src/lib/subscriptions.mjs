const DAY = 86400000;
// Service dates are interpreted in Goma (UTC+02), independently of the browser timezone.
export function serviceDate(value, endOfDay = false) {
  if (!value) return null;
  const raw = String(value);
  const date = new Date(raw.length === 10 ? `${raw}T${endOfDay ? '23:59:59' : '00:00:00'}+02:00` : /Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw.replace(' ', 'T')}+02:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function paidSubscriptionInvoices(contract, invoices) {
  return invoices.filter(i => String(i.contract_id) === String(contract.contract_id || contract.id))
    .filter(i => (i.invoice_type || 'facture') === 'facture' && !['annulee', 'brouillon'].includes(i.status))
    .filter(i => Number(i.subscription_amount_usd) > 0 && (i.status === 'payee' || (Number(i.total_amount_usd) > 0 && Number(i.paid_amount_usd) >= Number(i.total_amount_usd))))
    .filter(i => serviceDate(i.period_start) && serviceDate(i.period_end) && i.period_end >= i.period_start)
    .sort((a,b) => String(b.period_end).localeCompare(String(a.period_end)));
}
export function subscriptionCountdownForContract(contract, invoices, now = new Date()) {
  const paid = paidSubscriptionInvoices(contract, invoices);
  const correction = contract.deadline_correction;
  const renewal = correction && paid.find(i => (Number(i.id) > Number(correction.invoice_id_cutoff) || Number(i.last_payment_id) > Number(correction.payment_id_cutoff || 0)) && String(i.period_end).slice(0,10) > correction.expires_on);
  const useCorrection = correction && !renewal;
  const invoice = renewal || paid[0];
  const startedAt = serviceDate(invoice?.period_start || contract.activated_at);
  if (!startedAt) return null;
  let end = useCorrection ? serviceDate(correction.expires_on, true) : invoice ? serviceDate(invoice.period_end, true) : new Date(startedAt.getTime() + 30 * DAY);
  if (!end) return null;
  let suspendedAt = null;
  if (!useCorrection) {
    let lastEnd = startedAt.getTime();
    const suspensions = [...(contract.suspensions || [])].sort((a,b) => String(a.suspended_at).localeCompare(String(b.suspended_at)));
    for (const suspension of suspensions) {
      const start = serviceDate(suspension.suspended_at);
      const restored = serviceDate(suspension.restored_at);
      if (!start) continue;
      const from = Math.max(start.getTime(), startedAt.getTime(), lastEnd);
      // An interruption after expiry cannot revive an already exhausted subscription.
      if (from >= end.getTime()) continue;
      if (restored) {
        if (restored.getTime() > from) {
          end = new Date(end.getTime() + restored.getTime() - from);
          lastEnd = restored.getTime();
        }
      } else if (contract.status === 'suspendu') suspendedAt = new Date(from);
    }
  }
  const remainingMs = end.getTime() - (suspendedAt || now).getTime();
  const absolute = Math.abs(remainingMs);
  const days = remainingMs <= 0
    ? Math.max(0, Math.floor((now.getTime() + 2 * 3600000) / DAY) - Math.floor((end.getTime() + 2 * 3600000) / DAY))
    : Math.floor(absolute / DAY);
  return { startedAt, expiresAt:end, remainingMs, days, hours:Math.floor(absolute/3600000)%24, minutes:Math.floor(absolute/60000)%60,
    progress:Math.max(0, Math.min(100, remainingMs / (30 * DAY) * 100)), isPaused:Boolean(suspendedAt), suspendedAt,
    source:useCorrection ? 'Échéance corrigée' : invoice ? `Facture ${invoice.invoice_number || invoice.id}` : 'Période initiale de 30 jours' };
}

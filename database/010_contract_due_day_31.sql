-- Autorise les jours de paiement du 1 au 31.

ALTER TABLE contracts
  DROP CHECK chk_contracts_due_day;

ALTER TABLE contracts
  ADD CONSTRAINT chk_contracts_due_day
    CHECK (billing_due_day IS NULL OR billing_due_day BETWEEN 1 AND 31);

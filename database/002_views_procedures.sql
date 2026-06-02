-- LWASIVA_NET - Vues et procedures stockees
-- A executer apres database/001_initial_schema.sql
-- Compatible MySQL 8+ / MariaDB 10.5+

USE lwasiva_net;

-- ============================================================
-- VUES
-- ============================================================

CREATE OR REPLACE VIEW vw_active_contracts AS
SELECT
  c.id AS contract_id,
  c.contract_number,
  c.status,
  c.signed_at,
  c.activated_at,
  c.trial_ends_at,
  c.billing_due_day,
  cl.id AS client_id,
  cl.client_code,
  cl.full_name AS client_name,
  cl.phone AS client_phone,
  cl.address AS client_address,
  p.id AS plan_id,
  CASE WHEN p.name = 'Autre' THEN COALESCE(c.custom_plan_name, 'Autre') ELSE p.name END AS plan_name,
  p.bandwidth_mbps,
  CASE WHEN p.name = 'Autre' THEN COALESCE(c.custom_monthly_price_usd, p.monthly_price_usd) ELSE p.monthly_price_usd END AS monthly_price_usd,
  c.installation_address
FROM contracts c
INNER JOIN clients cl ON cl.id = c.client_id
INNER JOIN internet_plans p ON p.id = c.plan_id
WHERE c.status IN ('essai', 'actif', 'suspendu');

CREATE OR REPLACE VIEW vw_contract_balances AS
SELECT
  c.id AS contract_id,
  c.contract_number,
  cl.full_name AS client_name,
  cl.phone AS client_phone,
  COALESCE(SUM(i.total_amount_usd), 0.00) AS total_invoiced_usd,
  COALESCE((
    SELECT SUM(pay.amount_usd)
    FROM payments pay
    WHERE pay.contract_id = c.id
  ), 0.00) AS total_paid_usd,
  COALESCE(SUM(i.total_amount_usd), 0.00) - COALESCE((
    SELECT SUM(pay.amount_usd)
    FROM payments pay
    WHERE pay.contract_id = c.id
  ), 0.00) AS balance_usd
FROM contracts c
INNER JOIN clients cl ON cl.id = c.client_id
LEFT JOIN invoices i ON i.contract_id = c.id AND i.status <> 'annulee'
GROUP BY c.id, c.contract_number, cl.full_name, cl.phone;

CREATE OR REPLACE VIEW vw_unpaid_invoices AS
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.contract_id,
  c.contract_number,
  cl.full_name AS client_name,
  cl.phone AS client_phone,
  i.period_start,
  i.period_end,
  i.due_date,
  i.total_amount_usd,
  COALESCE(SUM(p.amount_usd), 0.00) AS paid_amount_usd,
  i.total_amount_usd - COALESCE(SUM(p.amount_usd), 0.00) AS remaining_amount_usd,
  i.status,
  DATEDIFF(CURRENT_DATE, i.due_date) AS days_late
FROM invoices i
INNER JOIN contracts c ON c.id = i.contract_id
INNER JOIN clients cl ON cl.id = c.client_id
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE i.status IN ('emise', 'partielle', 'en_retard')
GROUP BY
  i.id,
  i.invoice_number,
  i.contract_id,
  c.contract_number,
  cl.full_name,
  cl.phone,
  i.period_start,
  i.period_end,
  i.due_date,
  i.total_amount_usd,
  i.status;

CREATE OR REPLACE VIEW vw_equipment_payment_status AS
SELECT
  c.id AS contract_id,
  c.contract_number,
  cl.full_name AS client_name,
  cl.phone AS client_phone,
  ek.name AS equipment_kit,
  ek.total_price_usd AS equipment_total_usd,
  COALESCE(SUM(CASE WHEN ei.status = 'payee' THEN ei.amount_usd ELSE 0 END), 0.00) AS equipment_paid_usd,
  ek.total_price_usd - COALESCE(SUM(CASE WHEN ei.status = 'payee' THEN ei.amount_usd ELSE 0 END), 0.00) AS equipment_remaining_usd,
  ce.ownership_status
FROM contracts c
INNER JOIN clients cl ON cl.id = c.client_id
LEFT JOIN contract_equipment ce ON ce.contract_id = c.id
LEFT JOIN equipment_kits ek ON ek.id = ce.equipment_kit_id
LEFT JOIN equipment_installments ei ON ei.contract_id = c.id
GROUP BY
  c.id,
  c.contract_number,
  cl.full_name,
  cl.phone,
  ek.name,
  ek.total_price_usd,
  ce.ownership_status;

CREATE OR REPLACE VIEW vw_dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM clients) AS total_clients,
  (SELECT COUNT(*) FROM contracts WHERE status = 'actif') AS active_contracts,
  (SELECT COUNT(*) FROM contracts WHERE status = 'suspendu') AS suspended_contracts,
  (SELECT COUNT(*) FROM invoices WHERE status IN ('emise', 'partielle', 'en_retard')) AS unpaid_invoices,
  (SELECT COALESCE(SUM(amount_usd), 0.00) FROM payments WHERE DATE(paid_at) = CURRENT_DATE) AS payments_today_usd,
  (SELECT COUNT(*) FROM support_tickets WHERE status IN ('ouvert', 'en_cours')) AS open_tickets;

-- ============================================================
-- PROCEDURES STOCKEES
-- ============================================================

DELIMITER $$

CREATE PROCEDURE sp_create_monthly_invoice (
  IN p_contract_id BIGINT UNSIGNED,
  IN p_period_start DATE,
  IN p_period_end DATE,
  IN p_due_date DATE,
  IN p_equipment_installment_amount_usd DECIMAL(10,2),
  IN p_discount_amount_usd DECIMAL(10,2),
  OUT p_invoice_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_plan_price DECIMAL(10,2);
  DECLARE v_invoice_number VARCHAR(60);

  SELECT CASE
    WHEN ip.name = 'Autre' THEN COALESCE(c.custom_monthly_price_usd, ip.monthly_price_usd)
    ELSE ip.monthly_price_usd
  END
  INTO v_plan_price
  FROM contracts c
  INNER JOIN internet_plans ip ON ip.id = c.plan_id
  WHERE c.id = p_contract_id;

  IF v_plan_price IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Contrat introuvable pour la creation de facture';
  END IF;

  SET v_invoice_number = CONCAT(
    'FAC-',
    DATE_FORMAT(CURRENT_DATE, '%Y%m'),
    '-',
    LPAD(p_contract_id, 5, '0'),
    '-',
    LPAD(FLOOR(RAND() * 10000), 4, '0')
  );

  INSERT INTO invoices (
    invoice_number,
    contract_id,
    period_start,
    period_end,
    due_date,
    subscription_amount_usd,
    equipment_installment_amount_usd,
    discount_amount_usd,
    status
  )
  VALUES (
    v_invoice_number,
    p_contract_id,
    p_period_start,
    p_period_end,
    p_due_date,
    v_plan_price,
    COALESCE(p_equipment_installment_amount_usd, 0.00),
    COALESCE(p_discount_amount_usd, 0.00),
    'emise'
  );

  SET p_invoice_id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_register_payment (
  IN p_invoice_id BIGINT UNSIGNED,
  IN p_amount_usd DECIMAL(10,2),
  IN p_method VARCHAR(40),
  IN p_transaction_number VARCHAR(120),
  IN p_received_by BIGINT UNSIGNED,
  OUT p_payment_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_contract_id BIGINT UNSIGNED;
  DECLARE v_client_id BIGINT UNSIGNED;
  DECLARE v_invoice_total DECIMAL(10,2);
  DECLARE v_total_paid DECIMAL(10,2);
  DECLARE v_payment_reference VARCHAR(80);

  SELECT i.contract_id, c.client_id, i.total_amount_usd
  INTO v_contract_id, v_client_id, v_invoice_total
  FROM invoices i
  INNER JOIN contracts c ON c.id = i.contract_id
  WHERE i.id = p_invoice_id;

  IF v_contract_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Facture introuvable pour le paiement';
  END IF;

  SET v_payment_reference = CONCAT(
    'PAY-',
    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
    '-',
    LPAD(p_invoice_id, 5, '0')
  );

  INSERT INTO payments (
    payment_reference,
    invoice_id,
    contract_id,
    client_id,
    amount_usd,
    paid_at,
    method,
    transaction_number,
    received_by
  )
  VALUES (
    v_payment_reference,
    p_invoice_id,
    v_contract_id,
    v_client_id,
    p_amount_usd,
    NOW(),
    p_method,
    p_transaction_number,
    p_received_by
  );

  SET p_payment_id = LAST_INSERT_ID();

  SELECT COALESCE(SUM(amount_usd), 0.00)
  INTO v_total_paid
  FROM payments
  WHERE invoice_id = p_invoice_id;

  IF v_total_paid >= v_invoice_total THEN
    UPDATE invoices SET status = 'payee' WHERE id = p_invoice_id;
  ELSEIF v_total_paid > 0 THEN
    UPDATE invoices SET status = 'partielle' WHERE id = p_invoice_id;
  END IF;
END$$

CREATE PROCEDURE sp_suspend_contract (
  IN p_contract_id BIGINT UNSIGNED,
  IN p_reason VARCHAR(40),
  IN p_notes TEXT,
  IN p_created_by BIGINT UNSIGNED
)
BEGIN
  UPDATE contracts
  SET status = 'suspendu'
  WHERE id = p_contract_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Contrat introuvable pour la suspension';
  END IF;

  INSERT INTO service_suspensions (
    contract_id,
    reason,
    suspended_at,
    notes,
    created_by
  )
  VALUES (
    p_contract_id,
    p_reason,
    NOW(),
    p_notes,
    p_created_by
  );
END$$

CREATE PROCEDURE sp_restore_contract (
  IN p_contract_id BIGINT UNSIGNED,
  IN p_notes TEXT
)
BEGIN
  UPDATE contracts
  SET status = 'actif'
  WHERE id = p_contract_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Contrat introuvable pour la reactivation';
  END IF;

  UPDATE service_suspensions
  SET restored_at = NOW(),
      notes = CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE '\n' END, COALESCE(p_notes, ''))
  WHERE contract_id = p_contract_id
    AND restored_at IS NULL;
END$$

CREATE PROCEDURE sp_mark_late_invoices ()
BEGIN
  UPDATE invoices
  SET status = 'en_retard'
  WHERE status IN ('emise', 'partielle')
    AND due_date < CURRENT_DATE;
END$$

CREATE PROCEDURE sp_open_support_ticket (
  IN p_client_id BIGINT UNSIGNED,
  IN p_contract_id BIGINT UNSIGNED,
  IN p_title VARCHAR(180),
  IN p_description TEXT,
  IN p_priority VARCHAR(40),
  IN p_assigned_to BIGINT UNSIGNED,
  OUT p_ticket_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_ticket_number VARCHAR(60);

  SET v_ticket_number = CONCAT(
    'TIC-',
    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
    '-',
    LPAD(p_client_id, 5, '0')
  );

  INSERT INTO support_tickets (
    ticket_number,
    client_id,
    contract_id,
    title,
    description,
    priority,
    assigned_to
  )
  VALUES (
    v_ticket_number,
    p_client_id,
    p_contract_id,
    p_title,
    p_description,
    COALESCE(p_priority, 'normale'),
    p_assigned_to
  );

  SET p_ticket_id = LAST_INSERT_ID();
END$$

DELIMITER ;

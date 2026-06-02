-- Adds an optional installation amount line for compact invoices.

SET @has_installation_amount = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'invoices'
    AND column_name = 'installation_amount_usd'
);

SET @sql_installation_amount = IF(
  @has_installation_amount = 0,
  'ALTER TABLE invoices ADD COLUMN installation_amount_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER due_date',
  'SELECT ''installation_amount_usd deja present'''
);

PREPARE stmt FROM @sql_installation_amount;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE invoices
  MODIFY total_amount_usd DECIMAL(10,2) AS (
    installation_amount_usd + subscription_amount_usd + equipment_installment_amount_usd + penalty_amount_usd - discount_amount_usd
  ) STORED;

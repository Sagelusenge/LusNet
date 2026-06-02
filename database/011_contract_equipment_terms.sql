-- Ajoute les conditions de paiement du kit dans chaque contrat.

SET @has_equipment_total = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contracts'
    AND column_name = 'equipment_total_price_usd'
);

SET @sql_equipment_total = IF(
  @has_equipment_total = 0,
  'ALTER TABLE contracts ADD COLUMN equipment_total_price_usd DECIMAL(10,2) NOT NULL DEFAULT 100.00 AFTER custom_monthly_price_usd',
  'SELECT 1'
);
PREPARE stmt FROM @sql_equipment_total;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_equipment_initial = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contracts'
    AND column_name = 'equipment_initial_payment_usd'
);

SET @sql_equipment_initial = IF(
  @has_equipment_initial = 0,
  'ALTER TABLE contracts ADD COLUMN equipment_initial_payment_usd DECIMAL(10,2) NOT NULL DEFAULT 20.00 AFTER equipment_total_price_usd',
  'SELECT 1'
);
PREPARE stmt FROM @sql_equipment_initial;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_equipment_monthly = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contracts'
    AND column_name = 'equipment_monthly_payment_usd'
);

SET @sql_equipment_monthly = IF(
  @has_equipment_monthly = 0,
  'ALTER TABLE contracts ADD COLUMN equipment_monthly_payment_usd DECIMAL(10,2) NULL AFTER equipment_initial_payment_usd',
  'SELECT 1'
);
PREPARE stmt FROM @sql_equipment_monthly;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_equipment_paid_full = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contracts'
    AND column_name = 'equipment_paid_in_full'
);

SET @sql_equipment_paid_full = IF(
  @has_equipment_paid_full = 0,
  'ALTER TABLE contracts ADD COLUMN equipment_paid_in_full BOOLEAN NOT NULL DEFAULT FALSE AFTER equipment_monthly_payment_usd',
  'SELECT 1'
);
PREPARE stmt FROM @sql_equipment_paid_full;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

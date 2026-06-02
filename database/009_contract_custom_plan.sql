-- Ajoute un tarif personnalise par contrat pour le bouquet "Autre".

SET @has_custom_plan_name = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contracts'
    AND column_name = 'custom_plan_name'
);

SET @sql_custom_plan_name = IF(
  @has_custom_plan_name = 0,
  'ALTER TABLE contracts ADD COLUMN custom_plan_name VARCHAR(120) NULL AFTER billing_due_day',
  'SELECT 1'
);

PREPARE stmt FROM @sql_custom_plan_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_custom_monthly_price = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contracts'
    AND column_name = 'custom_monthly_price_usd'
);

SET @sql_custom_monthly_price = IF(
  @has_custom_monthly_price = 0,
  'ALTER TABLE contracts ADD COLUMN custom_monthly_price_usd DECIMAL(10,2) NULL AFTER custom_plan_name',
  'SELECT 1'
);

PREPARE stmt FROM @sql_custom_monthly_price;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adds network identity fields to equipment already assigned to contracts.

SET @has_equipment_name = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contract_equipment'
    AND column_name = 'equipment_name'
);
SET @sql_equipment_name = IF(
  @has_equipment_name = 0,
  'ALTER TABLE contract_equipment ADD COLUMN equipment_name VARCHAR(160) NULL AFTER equipment_kit_id',
  'SELECT ''equipment_name deja present'''
);
PREPARE stmt FROM @sql_equipment_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_ip_address = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contract_equipment'
    AND column_name = 'ip_address'
);
SET @sql_ip_address = IF(
  @has_ip_address = 0,
  'ALTER TABLE contract_equipment ADD COLUMN ip_address VARCHAR(45) NULL AFTER router_serial_number',
  'SELECT ''ip_address deja present'''
);
PREPARE stmt FROM @sql_ip_address;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_mac_address = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'contract_equipment'
    AND column_name = 'mac_address'
);
SET @sql_mac_address = IF(
  @has_mac_address = 0,
  'ALTER TABLE contract_equipment ADD COLUMN mac_address VARCHAR(50) NULL AFTER ip_address',
  'SELECT ''mac_address deja present'''
);
PREPARE stmt FROM @sql_mac_address;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

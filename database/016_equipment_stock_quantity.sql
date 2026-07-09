-- Ajoute la quantite achetee par categorie de materiel.

SET @has_stock_quantity = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'equipment_kits'
    AND column_name = 'stock_quantity'
);

SET @sql_stock_quantity = IF(
  @has_stock_quantity = 0,
  'ALTER TABLE equipment_kits ADD COLUMN stock_quantity INT UNSIGNED NOT NULL DEFAULT 0 AFTER total_price_usd',
  'SELECT ''stock_quantity deja present'''
);

PREPARE stmt FROM @sql_stock_quantity;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ajoute le type de document facture et le statut non reglee.

SET @has_invoice_type = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'invoices'
    AND column_name = 'invoice_type'
);

SET @sql_invoice_type = IF(
  @has_invoice_type = 0,
  'ALTER TABLE invoices ADD COLUMN invoice_type ENUM(''facture'', ''proforma'', ''avoir'') NOT NULL DEFAULT ''facture'' AFTER invoice_number',
  'SELECT 1'
);
PREPARE stmt FROM @sql_invoice_type;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE invoices
  MODIFY status ENUM('brouillon', 'non_reglee', 'emise', 'payee', 'partielle', 'en_retard', 'annulee') NOT NULL DEFAULT 'non_reglee';

UPDATE invoices
SET status = 'non_reglee'
WHERE status = 'emise';

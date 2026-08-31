-- LWASIVA_NET - Espace prive Ghislain

USE lwasiva_net;

CREATE TABLE IF NOT EXISTS ghislain_cashbook_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  movement_type ENUM('entree', 'sortie') NOT NULL,
  title VARCHAR(180) NOT NULL,
  amount_usd DECIMAL(12,2) NOT NULL,
  entry_date DATE NOT NULL,
  payment_method ENUM('especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre') NOT NULL DEFAULT 'especes',
  reference VARCHAR(160) NULL,
  third_party VARCHAR(160) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ghislain_cashbook_date (entry_date, id),
  INDEX idx_ghislain_cashbook_type (movement_type, entry_date),
  CONSTRAINT fk_ghislain_cashbook_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ghislain_budget_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_type ENUM('recette', 'depense') NOT NULL,
  category VARCHAR(140) NOT NULL,
  title VARCHAR(180) NOT NULL,
  planned_amount_usd DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  actual_amount_usd DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  entry_date DATE NOT NULL,
  budget_period VARCHAR(80) NULL,
  status ENUM('prevu', 'engage', 'termine') NOT NULL DEFAULT 'prevu',
  reference VARCHAR(160) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ghislain_budget_date (entry_date, id),
  INDEX idx_ghislain_budget_type_category (entry_type, category),
  CONSTRAINT fk_ghislain_budget_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_ghislain_cashbook_entries AS
SELECT
  gce.id,
  gce.movement_type,
  gce.title,
  gce.amount_usd,
  gce.entry_date,
  gce.payment_method,
  gce.reference,
  gce.third_party,
  gce.notes,
  gce.created_at,
  gce.updated_at,
  u.full_name AS created_by_name
FROM ghislain_cashbook_entries gce
LEFT JOIN users u ON u.id = gce.created_by;

CREATE OR REPLACE VIEW vw_ghislain_budget_entries AS
SELECT
  gbe.id,
  gbe.entry_type,
  gbe.category,
  gbe.title,
  gbe.planned_amount_usd,
  gbe.actual_amount_usd,
  gbe.actual_amount_usd - gbe.planned_amount_usd AS variance_usd,
  gbe.entry_date,
  gbe.budget_period,
  gbe.status,
  gbe.reference,
  gbe.notes,
  gbe.created_at,
  gbe.updated_at,
  u.full_name AS created_by_name
FROM ghislain_budget_entries gbe
LEFT JOIN users u ON u.id = gbe.created_by;

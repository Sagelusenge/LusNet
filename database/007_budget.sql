-- LWASIVA_NET - Budget: recettes et depenses

USE lwasiva_net;

CREATE TABLE IF NOT EXISTS budget_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  type ENUM('recette', 'depense') NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_budget_categories_name_type (name, type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_type ENUM('recette', 'depense') NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  amount_usd DECIMAL(12,2) NOT NULL,
  entry_date DATE NOT NULL,
  payment_method ENUM('especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre') NOT NULL DEFAULT 'especes',
  reference VARCHAR(160) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_budget_entries_type_date (entry_type, entry_date),
  INDEX idx_budget_entries_category (category_id),
  CONSTRAINT fk_budget_entries_category
    FOREIGN KEY (category_id) REFERENCES budget_categories(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_budget_entries_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_budget_entries AS
SELECT
  be.id,
  be.entry_type,
  be.category_id,
  bc.name AS category_name,
  be.title,
  be.amount_usd,
  be.entry_date,
  be.payment_method,
  be.reference,
  be.notes,
  be.created_at,
  u.full_name AS created_by_name
FROM budget_entries be
INNER JOIN budget_categories bc ON bc.id = be.category_id
LEFT JOIN users u ON u.id = be.created_by;

CREATE OR REPLACE VIEW vw_budget_summary AS
SELECT
  COALESCE(SUM(CASE WHEN entry_type = 'recette' THEN amount_usd ELSE 0 END), 0) AS total_recettes_usd,
  COALESCE(SUM(CASE WHEN entry_type = 'depense' THEN amount_usd ELSE 0 END), 0) AS total_depenses_usd,
  COALESCE(SUM(CASE WHEN entry_type = 'recette' THEN amount_usd ELSE -amount_usd END), 0) AS solde_usd
FROM budget_entries;

INSERT IGNORE INTO budget_categories (name, type, description) VALUES
  ('Paiement abonnes', 'recette', 'Paiements mensuels des clients abonnes'),
  ('Financement', 'recette', 'Apport, aide ou financement externe'),
  ('Autres recettes', 'recette', 'Toute autre entree d argent'),
  ('Achat de materiels', 'depense', 'Antenne CPE, routeur, cables et accessoires'),
  ('Transport', 'depense', 'Deplacement terrain et interventions'),
  ('Maintenance', 'depense', 'Entretien et reparation reseau'),
  ('Salaire equipe', 'depense', 'Paiement du personnel'),
  ('Autres depenses', 'depense', 'Toute autre sortie d argent');

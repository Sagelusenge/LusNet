-- LWASIVA_NET - Schema initial de base de donnees
-- Compatible MySQL 8+ / MariaDB 10.5+

CREATE DATABASE IF NOT EXISTS lwasiva_net
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lwasiva_net;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(180) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'technician', 'cashier') NOT NULL DEFAULT 'manager',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE clients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_code VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  client_type ENUM('particulier', 'entreprise') NOT NULL DEFAULT 'particulier',
  phone VARCHAR(40) NOT NULL,
  secondary_phone VARCHAR(40) NULL,
  email VARCHAR(180) NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Goma',
  province VARCHAR(100) NOT NULL DEFAULT 'Nord-Kivu',
  country VARCHAR(100) NOT NULL DEFAULT 'RDC',
  identity_document_type VARCHAR(80) NULL,
  identity_document_number VARCHAR(120) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clients_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE internet_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  bandwidth_mbps INT UNSIGNED NOT NULL,
  recommended_usage VARCHAR(255) NOT NULL,
  monthly_price_usd DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_number VARCHAR(60) NOT NULL UNIQUE,
  client_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('brouillon', 'essai', 'actif', 'suspendu', 'resilie') NOT NULL DEFAULT 'brouillon',
  signed_at DATE NULL,
  activated_at DATE NULL,
  trial_ends_at DATE NULL,
  minimum_commitment_months INT UNSIGNED NULL,
  billing_due_day TINYINT UNSIGNED NULL,
  custom_plan_name VARCHAR(120) NULL,
  custom_monthly_price_usd DECIMAL(10,2) NULL,
  equipment_total_price_usd DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  equipment_initial_payment_usd DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  equipment_monthly_payment_usd DECIMAL(10,2) NULL,
  equipment_paid_in_full BOOLEAN NOT NULL DEFAULT FALSE,
  payment_deadline_days_before_due TINYINT UNSIGNED NOT NULL DEFAULT 2,
  installation_address TEXT NOT NULL,
  installation_latitude DECIMAL(10,7) NULL,
  installation_longitude DECIMAL(10,7) NULL,
  resale_forbidden BOOLEAN NOT NULL DEFAULT TRUE,
  operator_representative VARCHAR(180) NOT NULL DEFAULT 'KITSA LUSENGE LWASIVA Sage',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_contracts_due_day
    CHECK (billing_due_day IS NULL OR billing_due_day BETWEEN 1 AND 31),
  CONSTRAINT fk_contracts_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contracts_plan
    FOREIGN KEY (plan_id) REFERENCES internet_plans(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contracts_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE equipment_kits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  total_price_usd DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE contract_equipment (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  equipment_kit_id BIGINT UNSIGNED NOT NULL,
  cpe_serial_number VARCHAR(120) NULL,
  router_serial_number VARCHAR(120) NULL,
  installed_at DATE NULL,
  installed_by BIGINT UNSIGNED NULL,
  ownership_status ENUM('propriete_operateur', 'propriete_client') NOT NULL DEFAULT 'propriete_operateur',
  condition_status ENUM('neuf', 'bon', 'a_reparer', 'remplace', 'recupere') NOT NULL DEFAULT 'bon',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contract_equipment_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contract_equipment_kit
    FOREIGN KEY (equipment_kit_id) REFERENCES equipment_kits(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_contract_equipment_installed_by
    FOREIGN KEY (installed_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE equipment_installments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  installment_number INT UNSIGNED NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at DATE NULL,
  status ENUM('a_payer', 'payee', 'en_retard', 'annulee') NOT NULL DEFAULT 'a_payer',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_installment_contract_number (contract_id, installment_number),
  CONSTRAINT fk_equipment_installments_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(60) NOT NULL UNIQUE,
  invoice_type ENUM('facture', 'proforma', 'avoir') NOT NULL DEFAULT 'facture',
  contract_id BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  subscription_amount_usd DECIMAL(10,2) NOT NULL,
  equipment_installment_amount_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  penalty_amount_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount_usd DECIMAL(10,2) AS (
    subscription_amount_usd + equipment_installment_amount_usd + penalty_amount_usd - discount_amount_usd
  ) STORED,
  status ENUM('brouillon', 'non_reglee', 'emise', 'payee', 'partielle', 'en_retard', 'annulee') NOT NULL DEFAULT 'non_reglee',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_reference VARCHAR(80) NOT NULL UNIQUE,
  invoice_id BIGINT UNSIGNED NULL,
  contract_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  paid_at DATETIME NOT NULL,
  method ENUM('especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre') NOT NULL,
  transaction_number VARCHAR(120) NULL,
  received_by BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_payments_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_payments_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_payments_received_by
    FOREIGN KEY (received_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE service_suspensions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  reason ENUM('impaye', 'revente_interdite', 'maintenance', 'demande_client', 'autre') NOT NULL,
  suspended_at DATETIME NOT NULL,
  restored_at DATETIME NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_suspensions_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_service_suspensions_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE support_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(60) NOT NULL UNIQUE,
  client_id BIGINT UNSIGNED NOT NULL,
  contract_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('basse', 'normale', 'haute', 'urgente') NOT NULL DEFAULT 'normale',
  status ENUM('ouvert', 'en_cours', 'resolu', 'ferme') NOT NULL DEFAULT 'ouvert',
  assigned_to BIGINT UNSIGNED NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_tickets_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_support_tickets_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_support_tickets_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE contract_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  document_type ENUM('contrat_signe', 'piece_identite', 'photo_installation', 'autre') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contract_documents_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contract_documents_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_invoices_contract_status ON invoices(contract_id, status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_tickets_status_priority ON support_tickets(status, priority);

INSERT INTO internet_plans (name, bandwidth_mbps, recommended_usage, monthly_price_usd)
VALUES
  ('Basic Home', 5, 'Navigation, reseaux sociaux, video SD', 15.00),
  ('Autre', 0, 'Tarif familial ou offre speciale', 10.00),
  ('Stream Plus', 10, 'Streaming HD, teletravail, appels video', 20.00),
  ('Pro Ultra', 30, 'Streaming 4K, gaming, multi-utilisateurs', 50.00);

INSERT INTO equipment_kits (name, description, total_price_usd)
VALUES
  ('Kit installation standard', 'Antenne receptrice/CPE, routeur Wi-Fi, cablage et accessoires', 100.00);

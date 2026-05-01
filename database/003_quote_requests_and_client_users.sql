-- LWASIVA_NET - Devis publics et espaces clients
-- A executer apres database/002_views_procedures.sql

USE lwasiva_net;

ALTER TABLE users
  MODIFY role ENUM('admin', 'manager', 'technician', 'cashier', 'client') NOT NULL DEFAULT 'manager';

ALTER TABLE users
  ADD COLUMN client_id BIGINT UNSIGNED NULL AFTER role,
  ADD CONSTRAINT fk_users_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE SET NULL;

CREATE TABLE quote_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_number VARCHAR(60) NOT NULL UNIQUE,
  full_name VARCHAR(180) NOT NULL,
  client_type ENUM('particulier', 'entreprise') NOT NULL DEFAULT 'particulier',
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(180) NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Goma',
  plan_id BIGINT UNSIGNED NULL,
  intended_usage VARCHAR(255) NULL,
  message TEXT NULL,
  status ENUM('nouveau', 'en_etude', 'valide', 'rejete', 'converti') NOT NULL DEFAULT 'nouveau',
  admin_notes TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  converted_client_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_requests_plan
    FOREIGN KEY (plan_id) REFERENCES internet_plans(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_quote_requests_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_quote_requests_client
    FOREIGN KEY (converted_client_id) REFERENCES clients(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_quote_requests AS
SELECT
  qr.id,
  qr.quote_number,
  qr.full_name,
  qr.client_type,
  qr.phone,
  qr.email,
  qr.address,
  qr.city,
  qr.intended_usage,
  qr.message,
  qr.status,
  qr.admin_notes,
  qr.created_at,
  qr.reviewed_at,
  ip.name AS plan_name,
  ip.bandwidth_mbps,
  ip.monthly_price_usd,
  u.full_name AS reviewed_by_name,
  qr.converted_client_id
FROM quote_requests qr
LEFT JOIN internet_plans ip ON ip.id = qr.plan_id
LEFT JOIN users u ON u.id = qr.reviewed_by;

CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_phone ON quote_requests(phone);

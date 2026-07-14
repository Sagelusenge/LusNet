-- Demandes publiques de creation de comptes clients avec validation admin.

CREATE TABLE IF NOT EXISTS client_account_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  client_type ENUM('particulier', 'entreprise') NOT NULL DEFAULT 'particulier',
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(180) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Goma',
  password_hash VARCHAR(255) NULL,
  status ENUM('en_attente', 'approuvee', 'rejetee') NOT NULL DEFAULT 'en_attente',
  admin_notes TEXT NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  client_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_account_requests_status_created (status, created_at),
  INDEX idx_account_requests_email (email),
  CONSTRAINT fk_account_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_account_requests_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_account_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE client_account_requests MODIFY password_hash VARCHAR(255) NULL;

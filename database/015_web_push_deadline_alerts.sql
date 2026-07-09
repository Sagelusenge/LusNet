-- Browser/mobile Web Push subscriptions and deadline delivery log.

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  endpoint VARCHAR(700) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth_secret VARCHAR(255) NOT NULL,
  expiration_time BIGINT NULL,
  user_agent VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_success_at DATETIME NULL,
  last_error_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_web_push_endpoint (endpoint),
  INDEX idx_web_push_user_active (user_id, is_active),
  CONSTRAINT fk_web_push_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deadline_push_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contract_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expiration_date DATE NOT NULL,
  alert_day TINYINT UNSIGNED NOT NULL,
  status ENUM('en_attente', 'envoye', 'echoue', 'sans_abonnement') NOT NULL DEFAULT 'en_attente',
  error_message TEXT NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_deadline_push_delivery (contract_id, user_id, expiration_date, alert_day),
  INDEX idx_deadline_push_status (status, created_at),
  CONSTRAINT fk_deadline_push_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_deadline_push_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

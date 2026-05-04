-- LWASIVA_NET - Messages internes et notifications push

USE lwasiva_net;

CREATE TABLE IF NOT EXISTS app_push_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  device_name VARCHAR(180) NULL,
  platform VARCHAR(40) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_push_tokens_token (expo_push_token),
  INDEX idx_app_push_tokens_user (user_id),
  CONSTRAINT fk_app_push_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  target_role ENUM('all', 'admin', 'manager', 'technician', 'cashier', 'client') NOT NULL DEFAULT 'all',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_messages_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_message_recipients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_app_message_recipient (message_id, user_id),
  INDEX idx_app_message_recipients_user (user_id, read_at),
  CONSTRAINT fk_app_message_recipients_message
    FOREIGN KEY (message_id) REFERENCES app_messages(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_app_message_recipients_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_app_messages_admin AS
SELECT
  am.id,
  am.title,
  am.body,
  am.target_role,
  am.created_at,
  u.full_name AS created_by_name,
  COUNT(amr.id) AS recipients_count,
  SUM(CASE WHEN amr.read_at IS NOT NULL THEN 1 ELSE 0 END) AS read_count
FROM app_messages am
LEFT JOIN users u ON u.id = am.created_by
LEFT JOIN app_message_recipients amr ON amr.message_id = am.id
GROUP BY am.id, am.title, am.body, am.target_role, am.created_at, u.full_name;

CREATE OR REPLACE VIEW vw_app_messages_user AS
SELECT
  amr.id AS recipient_id,
  amr.user_id,
  am.id AS message_id,
  am.title,
  am.body,
  am.target_role,
  am.created_at,
  amr.read_at,
  u.full_name AS created_by_name
FROM app_message_recipients amr
INNER JOIN app_messages am ON am.id = amr.message_id
LEFT JOIN users u ON u.id = am.created_by;

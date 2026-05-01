-- LWASIVA_NET - Notifications WhatsApp
-- A executer apres database/003_quote_requests_and_client_users.sql

USE lwasiva_net;

CREATE TABLE whatsapp_notification_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id BIGINT UNSIGNED NOT NULL,
  contract_id BIGINT UNSIGNED NULL,
  invoice_id BIGINT UNSIGNED NULL,
  phone VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  notification_type ENUM('abonnement_j_5', 'manuel') NOT NULL DEFAULT 'abonnement_j_5',
  provider_message_id VARCHAR(180) NULL,
  status ENUM('en_attente', 'envoye', 'echoue') NOT NULL DEFAULT 'en_attente',
  error_message TEXT NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_whatsapp_logs_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_whatsapp_logs_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_whatsapp_logs_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE UNIQUE INDEX uq_whatsapp_j5_invoice
  ON whatsapp_notification_logs(notification_type, invoice_id, phone);

CREATE OR REPLACE VIEW vw_whatsapp_notification_logs AS
SELECT
  wnl.id,
  wnl.notification_type,
  wnl.phone,
  wnl.message,
  wnl.status,
  wnl.error_message,
  wnl.provider_message_id,
  wnl.sent_at,
  wnl.created_at,
  cl.full_name AS client_name,
  c.contract_number,
  i.invoice_number,
  i.period_end,
  i.due_date,
  i.total_amount_usd
FROM whatsapp_notification_logs wnl
INNER JOIN clients cl ON cl.id = wnl.client_id
LEFT JOIN contracts c ON c.id = wnl.contract_id
LEFT JOIN invoices i ON i.id = wnl.invoice_id;

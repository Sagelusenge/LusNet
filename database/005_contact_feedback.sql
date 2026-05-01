-- LWASIVA_NET - Contact public et appreciations client
-- A executer apres database/004_whatsapp_notifications.sql

USE lwasiva_net;

CREATE TABLE contact_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(180) NULL,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('nouveau', 'lu', 'traite') NOT NULL DEFAULT 'nouveau',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE client_feedback (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  neighborhood VARCHAR(120) NULL,
  rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
  comment TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('nouveau', 'approuve', 'rejete') NOT NULL DEFAULT 'nouveau',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_client_feedback_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vw_public_feedback AS
SELECT
  id,
  full_name,
  neighborhood,
  rating,
  comment,
  created_at
FROM client_feedback
WHERE is_public = TRUE
  AND status = 'approuve'
ORDER BY created_at DESC;

CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_client_feedback_public ON client_feedback(is_public, status);

INSERT INTO client_feedback (full_name, neighborhood, rating, comment, is_public, status)
VALUES
  ('Client Basic Home', 'Katindo', 5, 'La connexion est stable pour la maison, les reseaux sociaux et les videos.', TRUE, 'approuve'),
  ('Client Stream Plus', 'Himbi', 5, 'Le streaming et les appels video fonctionnent bien, meme en teletravail.', TRUE, 'approuve'),
  ('Client Pro Ultra', 'Centre-ville', 5, 'Bon debit pour plusieurs utilisateurs et support technique reactif.', TRUE, 'approuve');

-- Ajoute le bouquet special "Autre" pour les tarifs familiaux.

INSERT INTO internet_plans (name, bandwidth_mbps, recommended_usage, monthly_price_usd, is_active)
VALUES ('Autre', 0, 'Tarif familial ou offre speciale', 10.00, TRUE)
ON DUPLICATE KEY UPDATE
  bandwidth_mbps = VALUES(bandwidth_mbps),
  recommended_usage = VALUES(recommended_usage),
  monthly_price_usd = VALUES(monthly_price_usd),
  is_active = TRUE;

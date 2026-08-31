const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

const allowedPaymentMethods = new Set(['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']);
const allowedCashbookTypes = new Set(['entree', 'sortie']);
const allowedBudgetTypes = new Set(['recette', 'depense']);
const allowedBudgetStatuses = new Set(['prevu', 'engage', 'termine']);
let schemaReadyPromise;

async function ensureGhislainSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS ghislain_cashbook_entries (
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
        ) ENGINE=InnoDB`
      );
      await query(
        `CREATE TABLE IF NOT EXISTS ghislain_budget_entries (
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
        ) ENGINE=InnoDB`
      );
      await query(
        `CREATE OR REPLACE VIEW vw_ghislain_cashbook_entries AS
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
         LEFT JOIN users u ON u.id = gce.created_by`
      );
      await query(
        `CREATE OR REPLACE VIEW vw_ghislain_budget_entries AS
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
         LEFT JOIN users u ON u.id = gbe.created_by`
      );
    })().catch((error) => {
      schemaReadyPromise = undefined;
      throw error;
    });
  }

  return schemaReadyPromise;
}

function positiveAmount(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new HttpError(400, `${label} doit etre un montant valide`);
  }
  return amount;
}

function requirePositiveAmount(value, label) {
  const amount = positiveAmount(value, label);
  if (amount <= 0) throw new HttpError(400, `${label} doit etre superieur a zero`);
  return amount;
}

function ensurePaymentMethod(method) {
  if (!allowedPaymentMethods.has(method)) {
    throw new HttpError(400, 'Methode de paiement invalide');
  }
  return method;
}

async function listCashbookEntries(req, res) {
  await ensureGhislainSchema();
  const rows = await query(
    `SELECT *
     FROM vw_ghislain_cashbook_entries
     ORDER BY entry_date DESC, id DESC`
  );
  res.json({ success: true, data: rows });
}

async function createCashbookEntry(req, res) {
  await ensureGhislainSchema();
  const {
    movementType,
    title,
    amountUsd,
    entryDate,
    paymentMethod = 'especes',
    reference,
    thirdParty,
    notes
  } = req.body;

  if (!allowedCashbookTypes.has(movementType)) throw new HttpError(400, 'Type de mouvement invalide');
  if (!title || !entryDate) throw new HttpError(400, 'Libelle et date sont obligatoires');

  const result = await query(
    `INSERT INTO ghislain_cashbook_entries (
      movement_type, title, amount_usd, entry_date, payment_method, reference, third_party, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movementType,
      title,
      requirePositiveAmount(amountUsd, 'Le montant'),
      entryDate,
      ensurePaymentMethod(paymentMethod),
      reference || null,
      thirdParty || null,
      notes || null,
      req.user?.id || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateCashbookEntry(req, res) {
  await ensureGhislainSchema();
  const {
    movementType,
    title,
    amountUsd,
    entryDate,
    paymentMethod,
    reference,
    thirdParty,
    notes
  } = req.body;
  const fields = [];
  const values = [];

  if (movementType !== undefined) {
    if (!allowedCashbookTypes.has(movementType)) throw new HttpError(400, 'Type de mouvement invalide');
    fields.push('movement_type = ?');
    values.push(movementType);
  }
  if (title !== undefined) {
    if (!title) throw new HttpError(400, 'Libelle obligatoire');
    fields.push('title = ?');
    values.push(title);
  }
  if (amountUsd !== undefined) {
    fields.push('amount_usd = ?');
    values.push(requirePositiveAmount(amountUsd, 'Le montant'));
  }
  if (entryDate !== undefined) {
    if (!entryDate) throw new HttpError(400, 'Date obligatoire');
    fields.push('entry_date = ?');
    values.push(entryDate);
  }
  if (paymentMethod !== undefined) {
    fields.push('payment_method = ?');
    values.push(ensurePaymentMethod(paymentMethod));
  }
  if (reference !== undefined) {
    fields.push('reference = ?');
    values.push(reference || null);
  }
  if (thirdParty !== undefined) {
    fields.push('third_party = ?');
    values.push(thirdParty || null);
  }
  if (notes !== undefined) {
    fields.push('notes = ?');
    values.push(notes || null);
  }
  if (fields.length === 0) throw new HttpError(400, 'Aucune modification envoyee');

  const result = await query(`UPDATE ghislain_cashbook_entries SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Ligne du livre de caisse introuvable');
  res.json({ success: true, message: 'Ligne du livre de caisse modifiee' });
}

async function deleteCashbookEntry(req, res) {
  await ensureGhislainSchema();
  const result = await query('DELETE FROM ghislain_cashbook_entries WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Ligne du livre de caisse introuvable');
  res.json({ success: true, message: 'Ligne du livre de caisse supprimee' });
}

async function listBudgetEntries(req, res) {
  await ensureGhislainSchema();
  const rows = await query(
    `SELECT *
     FROM vw_ghislain_budget_entries
     ORDER BY entry_date DESC, id DESC`
  );
  res.json({ success: true, data: rows });
}

async function createBudgetEntry(req, res) {
  await ensureGhislainSchema();
  const {
    entryType,
    category,
    title,
    plannedAmountUsd = 0,
    actualAmountUsd = 0,
    entryDate,
    budgetPeriod,
    status = 'prevu',
    reference,
    notes
  } = req.body;

  if (!allowedBudgetTypes.has(entryType)) throw new HttpError(400, 'Type de fiche budgetaire invalide');
  if (!allowedBudgetStatuses.has(status)) throw new HttpError(400, 'Statut de fiche invalide');
  if (!category || !title || !entryDate) throw new HttpError(400, 'Categorie, libelle et date sont obligatoires');

  const result = await query(
    `INSERT INTO ghislain_budget_entries (
      entry_type, category, title, planned_amount_usd, actual_amount_usd,
      entry_date, budget_period, status, reference, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entryType,
      category,
      title,
      positiveAmount(plannedAmountUsd, 'Le montant prevu'),
      positiveAmount(actualAmountUsd, 'Le montant realise'),
      entryDate,
      budgetPeriod || null,
      status,
      reference || null,
      notes || null,
      req.user?.id || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateBudgetEntry(req, res) {
  await ensureGhislainSchema();
  const {
    entryType,
    category,
    title,
    plannedAmountUsd,
    actualAmountUsd,
    entryDate,
    budgetPeriod,
    status,
    reference,
    notes
  } = req.body;
  const fields = [];
  const values = [];

  if (entryType !== undefined) {
    if (!allowedBudgetTypes.has(entryType)) throw new HttpError(400, 'Type de fiche budgetaire invalide');
    fields.push('entry_type = ?');
    values.push(entryType);
  }
  if (category !== undefined) {
    if (!category) throw new HttpError(400, 'Categorie obligatoire');
    fields.push('category = ?');
    values.push(category);
  }
  if (title !== undefined) {
    if (!title) throw new HttpError(400, 'Libelle obligatoire');
    fields.push('title = ?');
    values.push(title);
  }
  if (plannedAmountUsd !== undefined) {
    fields.push('planned_amount_usd = ?');
    values.push(positiveAmount(plannedAmountUsd, 'Le montant prevu'));
  }
  if (actualAmountUsd !== undefined) {
    fields.push('actual_amount_usd = ?');
    values.push(positiveAmount(actualAmountUsd, 'Le montant realise'));
  }
  if (entryDate !== undefined) {
    if (!entryDate) throw new HttpError(400, 'Date obligatoire');
    fields.push('entry_date = ?');
    values.push(entryDate);
  }
  if (budgetPeriod !== undefined) {
    fields.push('budget_period = ?');
    values.push(budgetPeriod || null);
  }
  if (status !== undefined) {
    if (!allowedBudgetStatuses.has(status)) throw new HttpError(400, 'Statut de fiche invalide');
    fields.push('status = ?');
    values.push(status);
  }
  if (reference !== undefined) {
    fields.push('reference = ?');
    values.push(reference || null);
  }
  if (notes !== undefined) {
    fields.push('notes = ?');
    values.push(notes || null);
  }
  if (fields.length === 0) throw new HttpError(400, 'Aucune modification envoyee');

  const result = await query(`UPDATE ghislain_budget_entries SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Ligne budgetaire Ghislain introuvable');
  res.json({ success: true, message: 'Ligne budgetaire Ghislain modifiee' });
}

async function deleteBudgetEntry(req, res) {
  await ensureGhislainSchema();
  const result = await query('DELETE FROM ghislain_budget_entries WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Ligne budgetaire Ghislain introuvable');
  res.json({ success: true, message: 'Ligne budgetaire Ghislain supprimee' });
}

async function getSummary(req, res) {
  await ensureGhislainSchema();
  const [cashbook] = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN movement_type = 'entree' THEN amount_usd ELSE 0 END), 0) AS total_entrees_usd,
       COALESCE(SUM(CASE WHEN movement_type = 'sortie' THEN amount_usd ELSE 0 END), 0) AS total_sorties_usd,
       COALESCE(SUM(CASE WHEN movement_type = 'entree' THEN amount_usd ELSE -amount_usd END), 0) AS solde_usd
     FROM ghislain_cashbook_entries`
  );
  const [budget] = await query(
    `SELECT
       COALESCE(SUM(planned_amount_usd), 0) AS total_prevu_usd,
       COALESCE(SUM(actual_amount_usd), 0) AS total_realise_usd,
       COALESCE(SUM(actual_amount_usd - planned_amount_usd), 0) AS ecart_usd
     FROM ghislain_budget_entries`
  );
  const byCategory = await query(
    `SELECT entry_type, category, SUM(planned_amount_usd) AS planned_usd, SUM(actual_amount_usd) AS actual_usd
     FROM ghislain_budget_entries
     GROUP BY entry_type, category
     ORDER BY entry_type, actual_usd DESC`
  );

  res.json({ success: true, data: { cashbook, budget, byCategory } });
}

module.exports = {
  listCashbookEntries,
  createCashbookEntry,
  updateCashbookEntry,
  deleteCashbookEntry,
  listBudgetEntries,
  createBudgetEntry,
  updateBudgetEntry,
  deleteBudgetEntry,
  getSummary
};

const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listCategories(req, res) {
  const rows = await query(
    `SELECT *
     FROM budget_categories
     WHERE (? IS NULL OR type = ?)
     ORDER BY type, name`,
    [req.query.type || null, req.query.type || null]
  );
  res.json({ success: true, data: rows });
}

async function createCategory(req, res) {
  const { name, type, description } = req.body;
  if (!name || !type) throw new HttpError(400, 'Nom et type sont obligatoires');

  const result = await query(
    'INSERT INTO budget_categories (name, type, description) VALUES (?, ?, ?)',
    [name, type, description || null]
  );
  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function listEntries(req, res) {
  const rows = await query(
    `SELECT *
     FROM vw_budget_entries
     WHERE (? IS NULL OR entry_type = ?)
       AND (? IS NULL OR entry_date >= ?)
       AND (? IS NULL OR entry_date <= ?)
     ORDER BY entry_date DESC, id DESC`,
    [
      req.query.type || null,
      req.query.type || null,
      req.query.from || null,
      req.query.from || null,
      req.query.to || null,
      req.query.to || null
    ]
  );
  res.json({ success: true, data: rows });
}

async function createEntry(req, res) {
  const {
    entryType,
    categoryId,
    title,
    amountUsd,
    entryDate,
    paymentMethod = 'especes',
    reference,
    notes
  } = req.body;

  if (!entryType || !categoryId || !title || !amountUsd || !entryDate) {
    throw new HttpError(400, 'Type, categorie, libelle, montant et date sont obligatoires');
  }

  const result = await query(
    `INSERT INTO budget_entries (
      entry_type, category_id, title, amount_usd, entry_date, payment_method, reference, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entryType, categoryId, title, amountUsd, entryDate, paymentMethod, reference || null, notes || null, req.user?.id || null]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateEntry(req, res) {
  const {
    entryType,
    categoryId,
    title,
    amountUsd,
    entryDate,
    paymentMethod,
    reference,
    notes
  } = req.body;

  await query(
    `UPDATE budget_entries
     SET entry_type = COALESCE(?, entry_type),
         category_id = COALESCE(?, category_id),
         title = COALESCE(?, title),
         amount_usd = COALESCE(?, amount_usd),
         entry_date = COALESCE(?, entry_date),
         payment_method = COALESCE(?, payment_method),
         reference = ?,
         notes = ?
     WHERE id = ?`,
    [
      entryType || null,
      categoryId || null,
      title || null,
      amountUsd || null,
      entryDate || null,
      paymentMethod || null,
      reference || null,
      notes || null,
      req.params.id
    ]
  );

  res.json({ success: true, message: 'Ligne budget modifiee' });
}

async function deleteEntry(req, res) {
  await query('DELETE FROM budget_entries WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Ligne budget supprimee' });
}

async function getSummary(req, res) {
  const [summary] = await query('SELECT * FROM vw_budget_summary');
  const byCategory = await query(
    `SELECT entry_type, category_name, SUM(amount_usd) AS total_usd
     FROM vw_budget_entries
     GROUP BY entry_type, category_name
     ORDER BY entry_type, total_usd DESC`
  );
  res.json({ success: true, data: { summary, byCategory } });
}

module.exports = {
  listCategories,
  createCategory,
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  getSummary
};

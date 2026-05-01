const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function createContactMessage(req, res) {
  const { fullName, phone, email, subject, message } = req.body;

  if (!fullName || !phone || !subject || !message) {
    throw new HttpError(400, 'Nom, telephone, sujet et message sont obligatoires');
  }

  const result = await query(
    `INSERT INTO contact_messages (full_name, phone, email, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
    [fullName, phone, email || null, subject, message]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function createFeedback(req, res) {
  const { fullName, neighborhood, rating = 5, comment } = req.body;

  if (!fullName || !comment) {
    throw new HttpError(400, 'Nom et appreciation sont obligatoires');
  }

  const result = await query(
    `INSERT INTO client_feedback (full_name, neighborhood, rating, comment)
     VALUES (?, ?, ?, ?)`,
    [fullName, neighborhood || null, rating, comment]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function listPublicFeedback(req, res) {
  const rows = await query('SELECT * FROM vw_public_feedback LIMIT 12');
  res.json({ success: true, data: rows });
}

async function listContactMessages(req, res) {
  const rows = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}

async function listAllFeedback(req, res) {
  const rows = await query('SELECT * FROM client_feedback ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}

async function updateFeedback(req, res) {
  const { status, isPublic } = req.body;
  await query(
    `UPDATE client_feedback
     SET status = COALESCE(?, status), is_public = COALESCE(?, is_public)
     WHERE id = ?`,
    [status || null, typeof isPublic === 'boolean' ? isPublic : null, req.params.id]
  );

  res.json({ success: true, message: 'Appreciation mise a jour' });
}

module.exports = {
  createContactMessage,
  createFeedback,
  listPublicFeedback,
  listContactMessages,
  listAllFeedback,
  updateFeedback
};

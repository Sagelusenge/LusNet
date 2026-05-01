const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

function generateQuoteNumber() {
  return `DEV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-5)}`;
}

async function createPublicQuote(req, res) {
  const {
    fullName,
    clientType = 'particulier',
    phone,
    email,
    address,
    city = 'Goma',
    planId,
    intendedUsage,
    message
  } = req.body;

  if (!fullName || !phone || !address) {
    throw new HttpError(400, 'Nom, telephone et adresse sont obligatoires');
  }

  const result = await query(
    `INSERT INTO quote_requests (
      quote_number, full_name, client_type, phone, email, address, city, plan_id, intended_usage, message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateQuoteNumber(),
      fullName,
      clientType,
      phone,
      email || null,
      address,
      city,
      planId || null,
      intendedUsage || null,
      message || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function listQuotes(req, res) {
  const rows = await query('SELECT * FROM vw_quote_requests ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}

async function updateQuoteStatus(req, res) {
  const { status, adminNotes } = req.body;

  await query(
    `UPDATE quote_requests
     SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [status, adminNotes || null, req.user?.id || null, req.params.id]
  );

  res.json({ success: true, message: 'Devis mis a jour' });
}

async function updateQuote(req, res) {
  const {
    fullName,
    clientType,
    phone,
    email,
    address,
    city,
    planId,
    intendedUsage,
    message,
    status,
    adminNotes
  } = req.body;

  await query(
    `UPDATE quote_requests
     SET full_name = COALESCE(?, full_name),
         client_type = COALESCE(?, client_type),
         phone = COALESCE(?, phone),
         email = ?,
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         plan_id = ?,
         intended_usage = ?,
         message = ?,
         status = COALESCE(?, status),
         admin_notes = ?
     WHERE id = ?`,
    [
      fullName || null,
      clientType || null,
      phone || null,
      email || null,
      address || null,
      city || null,
      planId || null,
      intendedUsage || null,
      message || null,
      status || null,
      adminNotes || null,
      req.params.id
    ]
  );

  res.json({ success: true, message: 'Devis modifie' });
}

async function deleteQuote(req, res) {
  await query('DELETE FROM quote_requests WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Devis supprime' });
}

async function convertQuoteToClient(req, res) {
  const quotes = await query('SELECT * FROM quote_requests WHERE id = ?', [req.params.id]);
  const quote = quotes[0];
  if (!quote) throw new HttpError(404, 'Devis introuvable');

  const clientCode = `CLI-${Date.now()}`;
  const result = await query(
    `INSERT INTO clients (client_code, full_name, client_type, phone, email, address, city, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientCode, quote.full_name, quote.client_type, quote.phone, quote.email, quote.address, quote.city, req.user?.id || null]
  );

  await query(
    `UPDATE quote_requests
     SET status = 'converti', converted_client_id = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE id = ?`,
    [result.insertId, req.user?.id || null, req.params.id]
  );

  res.status(201).json({ success: true, data: { clientId: result.insertId } });
}

module.exports = {
  createPublicQuote,
  listQuotes,
  updateQuote,
  deleteQuote,
  updateQuoteStatus,
  convertQuoteToClient
};

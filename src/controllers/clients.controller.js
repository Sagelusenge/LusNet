const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

function generateClientCode() {
  return `CLI-${Date.now()}`;
}

async function listClients(req, res) {
  const search = req.query.search ? `%${req.query.search}%` : null;
  const clients = await query(
    `SELECT *
     FROM clients
     WHERE (? IS NULL OR full_name LIKE ? OR phone LIKE ? OR client_code LIKE ?)
     ORDER BY created_at DESC`,
    [search, search, search, search]
  );

  res.json({ success: true, data: clients });
}

async function getClient(req, res) {
  const clients = await query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!clients[0]) throw new HttpError(404, 'Client introuvable');
  res.json({ success: true, data: clients[0] });
}

async function createClient(req, res) {
  const {
    clientCode,
    fullName,
    clientType = 'particulier',
    phone,
    secondaryPhone,
    email,
    address,
    city = 'Goma',
    province = 'Nord-Kivu',
    country = 'RDC',
    identityDocumentType,
    identityDocumentNumber,
    notes
  } = req.body;

  if (!fullName || !phone || !address) {
    throw new HttpError(400, 'Nom, telephone et adresse sont obligatoires');
  }

  const result = await query(
    `INSERT INTO clients (
      client_code, full_name, client_type, phone, secondary_phone, email, address,
      city, province, country, identity_document_type, identity_document_number, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clientCode || generateClientCode(),
      fullName,
      clientType,
      phone,
      secondaryPhone || null,
      email || null,
      address,
      city,
      province,
      country,
      identityDocumentType || null,
      identityDocumentNumber || null,
      notes || null,
      req.user?.id || null
    ]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateClient(req, res) {
  const {
    fullName,
    clientType,
    phone,
    secondaryPhone,
    email,
    address,
    city,
    province,
    country,
    identityDocumentType,
    identityDocumentNumber,
    notes
  } = req.body;

  await query(
    `UPDATE clients
     SET full_name = COALESCE(?, full_name),
         client_type = COALESCE(?, client_type),
         phone = COALESCE(?, phone),
         secondary_phone = ?,
         email = ?,
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         province = COALESCE(?, province),
         country = COALESCE(?, country),
         identity_document_type = ?,
         identity_document_number = ?,
         notes = ?
     WHERE id = ?`,
    [
      fullName,
      clientType,
      phone,
      secondaryPhone || null,
      email || null,
      address,
      city,
      province,
      country,
      identityDocumentType || null,
      identityDocumentNumber || null,
      notes || null,
      req.params.id
    ]
  );

  res.json({ success: true, message: 'Client mis a jour' });
}

async function deleteClient(req, res) {
  await query('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Client supprime' });
}

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient
};

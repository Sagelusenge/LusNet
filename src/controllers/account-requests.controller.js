const bcrypt = require('bcryptjs');
const { query, getConnection } = require('../config/database');
const HttpError = require('../utils/http-error');
const {
  notifyAdminsOfRequest,
  notifyClientDecision,
  notifyAdminsOfDecision
} = require('../services/account-notification.service');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createRequest(req, res) {
  const {
    fullName,
    clientType = 'particulier',
    phone,
    email,
    address,
    city = 'Goma',
    password
  } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!fullName || !phone || !normalizedEmail || !address || !password) {
    throw new HttpError(400, 'Nom, telephone, email, adresse et mot de passe sont obligatoires');
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) throw new HttpError(400, 'Adresse email invalide');
  if (String(password).length < 8) throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caracteres');
  if (!['particulier', 'entreprise'].includes(clientType)) throw new HttpError(400, 'Type de client invalide');

  const existingUser = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  if (existingUser[0]) throw new HttpError(409, 'Un compte existe deja avec cette adresse email');

  const pending = await query(
    "SELECT id FROM client_account_requests WHERE email = ? AND status = 'en_attente' LIMIT 1",
    [normalizedEmail]
  );
  if (pending[0]) throw new HttpError(409, 'Une demande avec cette adresse email attend deja la validation');

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO client_account_requests
      (full_name, client_type, phone, email, address, city, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [String(fullName).trim(), clientType, String(phone).trim(), normalizedEmail, String(address).trim(), String(city).trim() || 'Goma', passwordHash]
  );

  const request = {
    id: result.insertId,
    fullName: String(fullName).trim(),
    phone: String(phone).trim(),
    email: normalizedEmail,
    address: String(address).trim(),
    city: String(city).trim() || 'Goma'
  };
  notifyAdminsOfRequest(request).catch((error) => console.error('Notification demande compte:', error.message));

  res.status(201).json({
    success: true,
    data: { id: result.insertId, status: 'en_attente' },
    message: 'Demande envoyee. Un administrateur doit la valider avant votre premiere connexion.'
  });
}

async function listRequests(req, res) {
  const rows = await query(
    `SELECT car.id, car.full_name, car.client_type, car.phone, car.email, car.address, car.city,
            car.status, car.admin_notes, car.reviewed_at, car.client_id, car.user_id, car.created_at,
            u.full_name AS reviewed_by_name
     FROM client_account_requests car
     LEFT JOIN users u ON u.id = car.reviewed_by
     ORDER BY FIELD(car.status, 'en_attente', 'approuvee', 'rejetee'), car.created_at DESC`
  );
  res.json({ success: true, data: rows });
}

async function approveRequest(req, res) {
  const connection = await getConnection();
  let request;
  let clientId;
  let userId;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT * FROM client_account_requests WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    request = rows[0];
    if (!request) throw new HttpError(404, 'Demande introuvable');
    if (request.status !== 'en_attente') throw new HttpError(409, 'Cette demande a deja ete traitee');

    const [users] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [request.email]);
    if (users[0]) throw new HttpError(409, 'Un utilisateur utilise deja cette adresse email');

    const [clients] = await connection.execute(
      'SELECT id FROM clients WHERE email = ? OR phone = ? ORDER BY id ASC LIMIT 1',
      [request.email, request.phone]
    );
    clientId = clients[0]?.id;
    if (!clientId) {
      const clientCode = `CLI-${Date.now()}-${request.id}`;
      const [clientResult] = await connection.execute(
        `INSERT INTO clients (client_code, full_name, client_type, phone, email, address, city, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientCode, request.full_name, request.client_type, request.phone, request.email, request.address, request.city, req.user.id]
      );
      clientId = clientResult.insertId;
    }

    const [userResult] = await connection.execute(
      `INSERT INTO users (full_name, phone, email, password_hash, role, client_id, is_active)
       VALUES (?, ?, ?, ?, 'client', ?, TRUE)`,
      [request.full_name, request.phone, request.email, request.password_hash, clientId]
    );
    userId = userResult.insertId;

    await connection.execute(
      `UPDATE client_account_requests
       SET status = 'approuvee', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW(), client_id = ?, user_id = ?, password_hash = NULL
       WHERE id = ?`,
      [req.body.adminNotes || null, req.user.id, clientId, userId, request.id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const reviewer = await query('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
  request.admin_notes = req.body.adminNotes || null;
  Promise.allSettled([
    notifyClientDecision(request, true),
    notifyAdminsOfDecision(request, true, reviewer[0]?.full_name)
  ]).catch(() => null);
  res.json({ success: true, data: { clientId, userId }, message: 'Compte client approuve et active' });
}

async function rejectRequest(req, res) {
  const requests = await query('SELECT * FROM client_account_requests WHERE id = ? LIMIT 1', [req.params.id]);
  const request = requests[0];
  if (!request) throw new HttpError(404, 'Demande introuvable');
  if (request.status !== 'en_attente') throw new HttpError(409, 'Cette demande a deja ete traitee');

  const update = await query(
    `UPDATE client_account_requests
     SET status = 'rejetee', admin_notes = ?, reviewed_by = ?, reviewed_at = NOW(), password_hash = NULL
     WHERE id = ? AND status = 'en_attente'`,
    [req.body.adminNotes || null, req.user.id, request.id]
  );
  if (!update.affectedRows) throw new HttpError(409, 'Cette demande vient d etre traitee par un autre administrateur');
  request.admin_notes = req.body.adminNotes || null;
  const reviewer = await query('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
  Promise.allSettled([
    notifyClientDecision(request, false),
    notifyAdminsOfDecision(request, false, reviewer[0]?.full_name)
  ]).catch(() => null);
  res.json({ success: true, message: 'Demande rejetee' });
}

module.exports = { createRequest, listRequests, approveRequest, rejectRequest };

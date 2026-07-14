const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      fullName: user.full_name,
      role: user.role,
      clientId: user.client_id || null
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function register(req, res) {
  const { fullName, phone, email, password } = req.body;

  if (!fullName || !password) {
    throw new HttpError(400, 'Le nom complet et le mot de passe sont obligatoires');
  }

  const existingUsers = await query('SELECT COUNT(*) AS total FROM users');
  if (existingUsers[0].total > 0) {
    throw new HttpError(403, 'Seul l administrateur peut creer des utilisateurs apres initialisation');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [fullName, phone || null, email || null, passwordHash, 'admin']
  );

  res.status(201).json({
    success: true,
    data: { id: result.insertId }
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, 'Email et mot de passe obligatoires');
  }

  const users = await query('SELECT * FROM users WHERE email = ? AND is_active = TRUE LIMIT 1', [email]);
  const user = users[0];

  if (!user) {
    const requests = await query(
      "SELECT password_hash, status FROM client_account_requests WHERE email = ? ORDER BY created_at DESC LIMIT 1",
      [String(email).trim().toLowerCase()]
    ).catch(() => []);
    if (requests[0]?.password_hash && await bcrypt.compare(password, requests[0].password_hash)) {
      if (requests[0].status === 'en_attente') {
        throw new HttpError(403, 'Votre demande attend encore la validation de l administrateur');
      }
    }
  }

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Identifiants incorrects');
  }

  res.json({
    success: true,
    data: {
      token: signUser(user),
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        clientId: user.client_id || null
      }
    }
  });
}

async function me(req, res) {
  const users = await query(
    `SELECT id, full_name, phone, email, role, client_id, is_active
     FROM users
     WHERE id = ?`,
    [req.user.id]
  );

  if (!users[0]) throw new HttpError(404, 'Utilisateur introuvable');

  let client = null;
  if (users[0].client_id) {
    const clients = await query('SELECT * FROM clients WHERE id = ?', [users[0].client_id]);
    client = clients[0] || null;
  }

  res.json({ success: true, data: { user: users[0], client } });
}

module.exports = {
  register,
  login,
  me
};

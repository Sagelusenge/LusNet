const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const HttpError = require('../utils/http-error');

async function listUsers(req, res) {
  const users = await query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.role, u.client_id, u.is_active, c.full_name AS client_name
     FROM users u
     LEFT JOIN clients c ON c.id = u.client_id
     ORDER BY u.created_at DESC`
  );

  res.json({ success: true, data: users });
}

async function createUser(req, res) {
  const { fullName, phone, email, password, role = 'manager', clientId } = req.body;

  if (!fullName || !email || !password) {
    throw new HttpError(400, 'Nom, email et mot de passe sont obligatoires');
  }

  if (role === 'client' && !clientId) {
    throw new HttpError(400, 'Un utilisateur client doit etre lie a une fiche client');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role, client_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, phone || null, email, passwordHash, role, clientId || null]
  );

  res.status(201).json({ success: true, data: { id: result.insertId } });
}

async function updateUserStatus(req, res) {
  await query('UPDATE users SET is_active = ? WHERE id = ?', [Boolean(req.body.isActive), req.params.id]);
  res.json({ success: true, message: 'Utilisateur mis a jour' });
}

async function updateUser(req, res) {
  const { fullName, phone, email, role, clientId, isActive } = req.body;

  await query(
    `UPDATE users
     SET full_name = COALESCE(?, full_name),
         phone = ?,
         email = COALESCE(?, email),
         role = COALESCE(?, role),
         client_id = ?,
         is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [
      fullName || null,
      phone || null,
      email || null,
      role || null,
      clientId || null,
      typeof isActive === 'boolean' ? isActive : null,
      req.params.id
    ]
  );

  res.json({ success: true, message: 'Utilisateur modifie' });
}

async function deleteUser(req, res) {
  if (Number(req.params.id) === req.user.id) {
    throw new HttpError(400, 'Vous ne pouvez pas supprimer votre propre compte');
  }

  await query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Utilisateur supprime' });
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus
};

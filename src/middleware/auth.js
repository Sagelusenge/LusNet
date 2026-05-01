const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/http-error');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new HttpError(401, 'Authentification requise');
  }

  try {
    req.user = jwt.verify(token, env.jwt.secret);
    next();
  } catch (error) {
    throw new HttpError(401, 'Token invalide ou expire');
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'Acces refuse');
    }

    next();
  };
}

module.exports = {
  authenticate,
  allowRoles
};

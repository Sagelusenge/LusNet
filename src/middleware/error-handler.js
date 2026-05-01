function notFound(req, res, next) {
  const error = new Error(`Route introuvable: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Erreur interne du serveur'
  });
}

module.exports = {
  notFound,
  errorHandler
};

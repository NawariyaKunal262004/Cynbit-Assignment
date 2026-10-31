function errorHandler(err, req, res, next) {
  const statusCode = Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 600
    ? err.statusCode
    : 500;
  const message = statusCode >= 500
    ? 'Something went wrong. Please try again later.'
    : err.message || 'The request could not be completed.';

  if (statusCode >= 500) {
    console.error('Server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorHandler;

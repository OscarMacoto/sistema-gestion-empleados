export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.status || 500;

  console.error("ERROR GLOBAL:", {
    path: req.originalUrl,
    method: req.method,
    status,
    message: err.message,
    context: err.context,
    stack: err.stack,
  });

  if (err.number === 2627 || err.number === 2601) {
  err.status = 409;
  err.message = "El registro ya existe";
}

  res.status(status).json({
    success: false,
    error: err.message || "Error interno del servidor",
  });
};
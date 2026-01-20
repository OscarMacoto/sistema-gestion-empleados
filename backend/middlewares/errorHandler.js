export const errorHandler = (err, req, res, next) => {
  console.error("❌ ERROR GLOBAL:", {
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack,
  });

  const status = err.status || 500;

  res.status(status).json({
    success: false,
    error: err.message || "Error interno del servidor",
  });
};

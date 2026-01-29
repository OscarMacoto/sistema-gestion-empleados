import express from "express";
import cors from "cors";
import { connectDB, closeDB } from "./db.js";

import logsRouter from "./routes/logs.js";
import empleadosRouter from "./routes/empleados.js";
import clinicasRouter from "./routes/clinicas.js";
import estadosRouter from "./routes/estados.js";
import ssoRouter from "./routes/sso.js";
import rolesRouter from "./routes/roles.js";
import authRoutes from "./routes/auth.js";
import areasRouter from "./routes/areas.js";

import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.set("trust proxy", true);

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  try {
    const pool = await connectDB();
    if (!pool?.connected) {
      return res.status(503).json({ status: "db-not-connected" });
    }
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "db-connecting-error" });
  }
});

app.use("/api/logs", logsRouter);
app.use("/api/empleados", empleadosRouter);
app.use("/api/clinicas", clinicasRouter);
app.use("/api/estados", estadosRouter);
app.use("/api/sso", ssoRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/auth", authRoutes);
app.use("/api/areas", areasRouter);

app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use(errorHandler);

let server;

(async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      console.log("Conexión a la base de datos establecida correctamente.");
      console.log(`CORS permitido para: ${CLIENT_ORIGIN}`);
    });
  } catch (err) {
    console.error("Error al iniciar el servidor:", err);
    process.exitCode = 1;
  }
})();

function shutdown(signal) {
  console.log(`\n📴 Recibido ${signal}. Cerrando servidor...`);
  if (server) {
    server.close(async () => {
      console.log("Servidor HTTP cerrado.");
      await closeDB();
      process.exit(0);
    });
    setTimeout(async () => {
      console.warn("Timeout al cerrar. Forzando salida...");
      await closeDB().catch(() => {});
      process.exit(1);
    }, 10000).unref();
  } else {
    closeDB().finally(() => process.exit(0));
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
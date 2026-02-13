import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";

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

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const USE_COOKIES = process.env.USE_COOKIES === "true";

app.set("trust proxy", 1); 


app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, 
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());


app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (CLIENT_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origin: ${origin}`), false);
    },
    credentials: USE_COOKIES,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 600,
  })
);

app.options("*", cors());


app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "dev" });
});

app.get("/api/ready", async (_req, res) => {
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
      console.log(`CORS permitido para: ${CLIENT_ORIGINS.join(", ")}`);
      console.log(`Cookies httpOnly activas: ${USE_COOKIES}`);
    });
  } catch (err) {
    console.error("Error al iniciar el servidor:", err);
    process.exitCode = 1;
  }
})();

function shutdown(signal) {
  console.log(`\n Recibido ${signal}. Cerrando servidor...`);
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
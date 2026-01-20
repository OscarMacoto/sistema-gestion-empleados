import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

import logsRouter from "./routes/logs.js";
import empleadosRouter from "./routes/empleados.js";
import clinicasRouter from "./routes/clinicas.js";
import estadosRouter from "./routes/estados.js";
import ssoRouter from "./routes/sso.js";
import rolesRouter from "./routes/roles.js";
import authRoutes from "./routes/auth.js";

import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();
const PORT = 5000;
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/logs", logsRouter);
app.use("/api/empleados", empleadosRouter);
app.use("/api/clinicas", clinicasRouter);
app.use("/api/estados", estadosRouter);
app.use("/api/sso", ssoRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/auth", authRoutes);
app.use(errorHandler);


(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      console.log("Conexión a la base de datos establecida correctamente.");
    });
  } catch (err) {
    console.error("Error al iniciar el servidor:", err);
  }
})();

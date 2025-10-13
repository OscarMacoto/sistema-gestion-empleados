import express from "express";
import cors from "cors";

import empleadosRoutes from "./routes/empleados.js";
import clinicasRoutes from "./routes/clinicas.js";
import estadosRoutes from "./routes/estados.js";
import ssoRoutes from "./routes/sso.js";

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));

app.use(express.json());

app.use("/api/empleados", empleadosRoutes);
app.use("/api/clinicas", clinicasRoutes);
app.use("/api/estados", estadosRoutes);
app.use("/api/sso", ssoRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});

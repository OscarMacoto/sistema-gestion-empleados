import express from "express";
import cors from "cors";
import sql from "mssql";
import { connectDB } from "./db.js";

import empleadosRoutes from "./routes/empleados.js";
import clinicasRoutes from "./routes/clinicas.js";
import estadosRoutes from "./routes/estados.js";
import ssoRoutes from "./routes/sso.js";

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/empleados", empleadosRoutes);
app.use("/api/clinicas", clinicasRoutes);
app.use("/api/estados", estadosRoutes);
app.use("/api/sso", ssoRoutes);

app.get("/api/empleados/email/:correo", async (req, res) => {
  try {
    const correo = req.params.correo;
    const pool = await connectDB();
    const result = await pool.request()
      .input("correo", sql.VarChar, correo)
      .query(`
        SELECT e.id_empleado, e.nombre, e.DNI, e.correo, e.fecha_ingreso, e.telefono,
               c.nombre_clinica AS clinica, est.descripcion AS estado
        FROM Empleado e
        INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
        INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado
        WHERE e.correo = @correo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error al obtener datos del empleado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/api/sso/actualizar-login", async (req, res) => {
  try {
    const { id_empleado } = req.body;
    if (!id_empleado) {
      return res.status(400).json({ error: "Falta el id_empleado" });
    }

    const pool = await connectDB();
    await pool.request()
      .input("id_empleado", sql.Int, id_empleado)
      .query(`
        UPDATE CuentaSSO
        SET L_login = GETDATE()
        WHERE id_empleado = @id_empleado
      `);

    res.json({ success: true, message: "L_login actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar L_login:", err);
    res.status(500).json({ error: "Error al actualizar L_login" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});


/*const router = express.Router();

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { id_clinica, id_estado } = req.body;

  if (!id_clinica || !id_estado) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    const pool = await connectDB();
    await pool.request()
      .input("id_empleado", sql.Int, id)
      .input("id_clinica", sql.Int, id_clinica)
      .input("id_estado", sql.Int, id_estado)
      .query(`
        UPDATE Empleado
        SET id_clinica = @id_clinica, id_estado = @id_estado
        WHERE id_empleado = @id_empleado
      `);

    res.status(200).json({ message: "Empleado actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar empleado:", error);
    res.status(500).json({ error: "Error al actualizar empleado" });
  }
});

export default router;*/

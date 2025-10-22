import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

const ejecutarConsulta = async (query) => {
  const pool = await connectDB();
  return await pool.request().query(query);
};

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id_empleado, 
        e.nombre, 
        c.L_login 
      FROM CuentaSSO c 
      INNER JOIN Empleado e ON c.id_empleado = e.id_empleado
    `;
    const result = await ejecutarConsulta(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener cuentas SSO:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
``
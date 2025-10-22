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
      SELECT id_estado, descripcion AS estado
      FROM Estado_empleado
    `;
    const result = await ejecutarConsulta(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener estados:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
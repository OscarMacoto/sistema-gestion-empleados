import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_estado, descripcion AS estado
      FROM Estado_empleado
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener estados:", err);
    res.status(500).json({ error: "Error al obtener estados" });
  }
});

export default router;

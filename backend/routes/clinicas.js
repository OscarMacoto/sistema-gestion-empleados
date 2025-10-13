import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT 
        id_clinica, 
        nombre_clinica 
      FROM Clinica
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener clínicas:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
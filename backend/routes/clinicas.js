import express from "express";
import { connectDB, sql } from "../db.js";

const router = express.Router();

// GET clínicas
router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_clinica, nombre_clinica 
      FROM Clinica
      ORDER BY id_clinica
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener clínicas:", err);
    res.status(500).json({ error: "Error al obtener clínicas", details: err.message });
  }
});

// Agregar nueva clínica
router.post("/", async (req, res) => {
  const { nombre_clinica } = req.body;

  if (!nombre_clinica) {
    return res.status(400).json({ error: "El nombre de la clínica es obligatorio." });
  }

  try {
    const pool = await connectDB();
    const insertResult = await pool
      .request()
      .input("nombre_clinica", sql.VarChar, nombre_clinica)
      .query(`
        INSERT INTO Clinica (nombre_clinica)
        OUTPUT INSERTED.id_clinica, INSERTED.nombre_clinica
        VALUES (@nombre_clinica)
      `);

    res.status(201).json(insertResult.recordset[0]);
  } catch (err) {
    console.error("Error al agregar clínica:", err);
    res.status(500).json({ error: "Error al agregar clínica", details: err.message });
  }
});

export default router;

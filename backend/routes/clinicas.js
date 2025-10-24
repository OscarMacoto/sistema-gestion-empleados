import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

// Obtener todas las clínicas
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

// Agregar una nueva clínica
router.post("/", async (req, res) => {
  const { nombre_clinica } = req.body;

  if (!nombre_clinica) {
    return res.status(400).json({ error: "El nombre de la clínica es obligatorio." });
  }

  try {
    const pool = await connectDB();
    await pool.request()
      .input("nombre_clinica", nombre_clinica)
      .query(`
        INSERT INTO Clinica (nombre_clinica)
        VALUES (@nombre_clinica)
      `);
    res.status(201).json({ message: "Clínica agregada exitosamente." });
  } catch (err) {
    console.error("Error al agregar clínica:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

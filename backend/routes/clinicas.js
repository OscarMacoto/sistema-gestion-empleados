import express from "express";
import { connectDB, sql } from "../db.js";

const router = express.Router();
const MAX_LEN = 200;
const COLLATION = "SQL_Latin1_General_CP1_CI_AI"; 

// GET /clinicas
router.get("/", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_clinica, nombre_clinica 
      FROM Clinica
      ORDER BY id_clinica
    `);

    res.json(result.recordset);
  } catch (err) {
    err.context = "GET /clinicas";
    next(err);
  }
});

// POST /clinicas (agregar)
router.post("/", async (req, res, next) => {
  try {
    const { nombre_clinica } = req.body ?? {};

    if (typeof nombre_clinica !== "string" || !nombre_clinica.trim()) {
      return res.status(400).json({ error: "El nombre de la clínica es obligatorio." });
    }

    const normalizado = nombre_clinica.trim().replace(/\s+/g, " ").toUpperCase();

    if (normalizado.length > MAX_LEN) {
      return res.status(400).json({
        error: `El nombre de la clínica supera el máximo de ${MAX_LEN} caracteres.`,
      });
    }

    const pool = await connectDB();

    const dup = await pool
      .request()
      .input("nombre", sql.NVarChar(MAX_LEN), normalizado)
      .query(`
        SELECT TOP 1 id_clinica
        FROM Clinica
        WHERE nombre_clinica COLLATE ${COLLATION}
              = @nombre COLLATE ${COLLATION}
      `);

    if (dup.recordset.length > 0) {
      return res.status(409).json({ error: "Ya existe una clínica con ese nombre." });
    }

    const insertResult = await pool
      .request()
      .input("nombre", sql.NVarChar(MAX_LEN), normalizado)
      .query(`
        INSERT INTO Clinica (nombre_clinica)
        OUTPUT INSERTED.id_clinica, INSERTED.nombre_clinica
        VALUES (@nombre)
      `);

    return res.status(201).json(insertResult.recordset[0]);
  } catch (err) {
    err.context = "POST /clinicas";
    next(err);
  }
});

export default router;
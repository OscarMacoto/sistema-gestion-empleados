import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_estado, descripcion AS estado
      FROM Estado_empleado
      ORDER BY id_estado
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener estados:", err);
    next(err);
  }
});

export default router;

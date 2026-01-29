
import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

// GET /areas
router.get("/", async (req, res, next) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT 
        id_area, 
        nombre_area
      FROM Area
      ORDER BY id_area
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener áreas:", err);
    err.context = "GET /areas";
    next(err);
  }
});

export default router;

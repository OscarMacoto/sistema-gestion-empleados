import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

// GET /sso
router.get("/", async (req, res, next) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT 
        e.id_empleado, 
        e.nombre, 
        c.L_login 
      FROM CuentaSSO c 
      INNER JOIN Empleado e ON c.id_empleado = e.id_empleado
    `);

    res.json(result.recordset);
  } catch (err) {
    err.context = "GET /sso";
    next(err);
  }
});

export default router;

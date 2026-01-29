import express from "express";
import { connectDB, sql } from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    let { page = 1, limit = 100 } = req.query;
    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ error: "Parámetro 'page' inválido. Debe ser un entero >= 1." });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({ error: "Parámetro 'limit' inválido. Debe estar entre 1 y 1000." });
    }

    const pool = await connectDB();

    const totalRes = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM CuentaSSO c
      INNER JOIN Empleado e ON c.id_empleado = e.id_empleado
    `);
    const total = totalRes.recordset[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const offset = (page - 1) * limit;
    const dataReq = pool.request()
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset);

    const dataSql = `
      SELECT 
        e.id_empleado,
        e.nombre,
        c.L_login
      FROM CuentaSSO c
      INNER JOIN Empleado e ON c.id_empleado = e.id_empleado
      ORDER BY c.L_login DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const dataRes = await dataReq.query(dataSql);
    const rows = dataRes.recordset;

    res.set("X-Total-Count", String(total));
    res.set("X-Total-Pages", String(totalPages));
    res.set("X-Page", String(page));
    res.set("X-Limit", String(limit));
    return res.json(rows);

  } catch (err) {
    err.context = "GET /sso";
    next(err);
  }
});

export default router;
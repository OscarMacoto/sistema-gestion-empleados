import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT 
        e.id_empleado, 
        e.nombre, 
        e.DNI, 
        e.correo, 
        CONVERT(varchar(10), e.fecha_ingreso, 120) AS fecha_ingreso, 
        e.telefono, 
        c.nombre_clinica AS clinica, 
        est.descripcion AS estado, 
        e.direccion
      FROM Empleado e
      INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
      INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado
      ORDER BY e.id_empleado ASC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener empleados:", err);
    res.status(500).json({ error: "Error al obtener empleados." });
  }
});

export default router;
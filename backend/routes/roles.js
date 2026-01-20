import express from "express";
import { connectDB, sql } from "../db.js";

const router = express.Router();

/**
 * Listar todos los roles
 */
router.get("/", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_rol, nombre_rol, descripcion
      FROM Rol_empleado
      ORDER BY id_rol
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener roles:", err);
    next(err);
  }
});

/**
 * Obtener roles de un empleado específico
 */
router.get("/empleado/:id", async (req, res, next) => {
  const id_empleado = Number(req.params.id);

  if (!Number.isInteger(id_empleado)) {
    return res.status(400).json({ error: "ID de empleado inválido" });
  }

  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input("id_empleado", sql.Int, id_empleado)
      .query(`
        SELECT r.id_rol, r.nombre_rol
        FROM Rol_empleado r
        INNER JOIN Empleado_Rol er ON r.id_rol = er.id_rol
        WHERE er.id_empleado = @id_empleado
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener roles del empleado:", err);
    next(err);
  }
});

/**
 * Asignar roles a un empleado
 */
router.post("/empleado/:id", async (req, res, next) => {
  const id_empleado = Number(req.params.id);
  const { roles } = req.body;

  if (!Number.isInteger(id_empleado)) {
    return res.status(400).json({ error: "ID de empleado inválido" });
  }

  if (!Array.isArray(roles) || roles.some(r => !Number.isInteger(r))) {
    return res.status(400).json({ error: "roles debe ser un array de ids numéricos" });
  }

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    await request
      .input("id_empleado", sql.Int, id_empleado)
      .query("DELETE FROM Empleado_Rol WHERE id_empleado = @id_empleado");

    for (const id_rol of roles) {
      await request
        .input("id_rol", sql.Int, id_rol)
        .query(`
          INSERT INTO Empleado_Rol (id_empleado, id_rol)
          VALUES (@id_empleado, @id_rol)
        `);
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: "Roles actualizados correctamente",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error al asignar roles:", err);
    next(err);
  }
});

export default router;

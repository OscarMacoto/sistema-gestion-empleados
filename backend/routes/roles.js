import express from "express";
import { connectDB, sql } from "../db.js";

const router = express.Router();

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
    err.context = "GET /roles";
    next(err);
  }
});

router.get("/empleado/:id", async (req, res, next) => {
  try {
    const id_empleado = Number(req.params.id);
    if (!Number.isInteger(id_empleado) || id_empleado <= 0) {
      return res.status(400).json({ error: "ID de empleado inválido" });
    }

    const pool = await connectDB();
    const result = await pool.request()
      .input("id_empleado", sql.Int, id_empleado)
      .query(`
        SELECT r.id_rol, r.nombre_rol
        FROM Rol_empleado r
        INNER JOIN Empleado_Rol er ON r.id_rol = er.id_rol
        WHERE er.id_empleado = @id_empleado
        ORDER BY r.id_rol
      `);

    res.json(result.recordset);
  } catch (err) {
    err.context = "GET /roles/empleado/:id";
    next(err);
  }
});

router.post("/empleado/:id", async (req, res, next) => {
  let transaction;
  try {
    const id_empleado = Number(req.params.id);
    const { roles } = req.body ?? {};

    if (!Number.isInteger(id_empleado) || id_empleado <= 0) {
      return res.status(400).json({ error: "ID de empleado inválido" });
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: "roles debe ser un array de ids numéricos (no vacío)" });
    }

    const rolesNorm = roles.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (rolesNorm.length !== roles.length) {
      return res.status(400).json({ error: "roles debe contener solo ids numéricos válidos" });
    }

    const pool = await connectDB();

    const emp = await pool.request()
      .input("id_empleado", sql.Int, id_empleado)
      .query("SELECT 1 FROM Empleado WHERE id_empleado = @id_empleado");
    if (emp.recordset.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    if (rolesNorm.length > 0) {
      const inList = rolesNorm.join(",");
      const existentes = await pool.request().query(`
        SELECT id_rol FROM Rol_empleado WHERE id_rol IN (${inList})
      `);
      const setExistentes = new Set(existentes.recordset.map((r) => r.id_rol));
      const faltantes = rolesNorm.filter((r) => !setExistentes.has(r));
      if (faltantes.length > 0) {
        return res.status(400).json({ error: `Los siguientes roles no existen: ${faltantes.join(", ")}` });
      }
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    await new sql.Request(transaction)
      .input("id_empleado", sql.Int, id_empleado)
      .query("DELETE FROM Empleado_Rol WHERE id_empleado = @id_empleado");

    for (const id_rol of rolesNorm) {
      await new sql.Request(transaction)
        .input("id_empleado", sql.Int, id_empleado)
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
    if (transaction && transaction.state === "begun") {
      try { await transaction.rollback(); } catch {}
    }
    if (err.number === 547) {
      err.status = 409;
      err.message = err.message || "No se puede asignar: conflicto de integridad referencial";
    }
    err.context = "POST /roles/empleado/:id";
    next(err);
  }
});

export default router;
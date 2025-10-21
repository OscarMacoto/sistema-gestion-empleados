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
        e.direccion,
        es.descripcion AS estado,
        c.nombre_clinica AS clinica
      FROM Empleado e
      INNER JOIN Estado_empleado es ON e.id_estado = es.id_estado
      INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
      ORDER BY e.id_empleado ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener empleados:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { nombre, DNI, correo, telefono, direccion, id_estado, id_clinica } = req.body;

  try {
    if (!nombre || !DNI || !correo || !telefono || !direccion || !id_estado || !id_clinica) {
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const pool = await connectDB();
    const fechaIngreso = new Date().toISOString().split("T")[0];

    const insertEmpleado = await pool.request().query(`
      INSERT INTO Empleado (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, fecha_ingreso)
      OUTPUT INSERTED.id_empleado
      VALUES ('${nombre}', '${DNI}', '${correo}', '${telefono}', '${direccion}', ${id_estado}, ${id_clinica}, '${fechaIngreso}')
    `);

    const id_empleado = insertEmpleado.recordset[0].id_empleado;

    await pool.request().query(`
      INSERT INTO CuentaSSO (id_empleado, L_login)
      VALUES (${id_empleado}, GETDATE())
    `);

    res.json({ message: "Empleado y cuenta SSO agregados correctamente." });
  } catch (err) {
    console.error("Error al agregar empleado:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, DNI, correo, telefono, direccion, id_estado, id_clinica } = req.body;

  try {
    const pool = await connectDB();

    await pool.request().query(`
      UPDATE Empleado
      SET nombre='${nombre}',
          DNI='${DNI}',
          correo='${correo}',
          telefono='${telefono}',
          direccion='${direccion}',
          id_estado=${id_estado},
          id_clinica=${id_clinica}
      WHERE id_empleado=${id}
    `);

    res.json({ message: "Empleado actualizado correctamente." });
  } catch (err) {
    console.error("Error al actualizar empleado:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await connectDB();

    await pool.request().query(`
      DELETE FROM Historial_clinica WHERE id_empleado = ${id}
    `);

    await pool.request().query(`
      DELETE FROM CuentaSSO WHERE id_empleado = ${id}
    `);

    await pool.request().query(`
      DELETE FROM Empleado WHERE id_empleado = ${id}
    `);

    res.json({ message: "Empleado y registros relacionados eliminados correctamente." });
  } catch (err) {
    console.error("Error al eliminar empleado:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/estados/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_estado, descripcion 
      FROM Estado_empleado 
      ORDER BY descripcion ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener lista de estados:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/clinicas/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT id_clinica, nombre_clinica 
      FROM Clinica 
      ORDER BY nombre_clinica ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener lista de clínicas:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
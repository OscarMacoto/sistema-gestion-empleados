import express from "express";
import sql from "mssql";
import { connectDB } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT e.id_empleado, e.nombre, e.DNI, e.correo, e.fecha_ingreso, e.fecha_salida,
             e.telefono, e.direccion,
             c.nombre_clinica AS clinica,
             est.descripcion AS estado
      FROM Empleado e
      INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
      INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener empleados:", err);
    res.status(500).json({ error: "Error al obtener empleados" });
  }
});

router.get("/estados/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Estado_empleado");
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estados" });
  }
});

router.get("/clinicas/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Clinica");
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener clínicas" });
  }
});

router.post("/", async (req, res) => {
  const { nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, usuario_email } = req.body;

  if (!nombre || !DNI || !correo || !id_estado || !id_clinica || !usuario_email) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const pool = await connectDB();

    const insertResult = await pool
      .request()
      .input("nombre", sql.VarChar, nombre)
      .input("DNI", sql.VarChar, DNI)
      .input("correo", sql.VarChar, correo)
      .input("telefono", sql.VarChar, telefono || "")
      .input("direccion", sql.VarChar, direccion || "")
      .input("id_estado", sql.Int, Number(id_estado))
      .input("id_clinica", sql.Int, Number(id_clinica))
      .query(`
        INSERT INTO Empleado (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, fecha_ingreso)
        VALUES (@nombre, @DNI, @correo, @telefono, @direccion, @id_estado, @id_clinica, GETDATE());
        SELECT SCOPE_IDENTITY() AS id_empleado;
      `);

    const nuevoEmpleadoId = insertResult.recordset[0].id_empleado;

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, usuario_email)
      .query("SELECT id_empleado, nombre FROM Empleado WHERE correo = @correo");

    if (usuarioResult.recordset.length === 0)
      return res.status(404).json({ error: "Usuario activo no encontrado" });

    const usuarioActual = usuarioResult.recordset[0];

    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "agregado")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input("detalles", sql.VarChar, `El usuario ${usuarioActual.nombre} ha agregado al empleado ${nombre}`)
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true, id_empleado: nuevoEmpleadoId });
  } catch (err) {
    console.error("Error al agregar empleado:", err);
    res.status(500).json({ error: "Error al agregar empleado" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { id_estado, id_clinica, usuario_email } = req.body;

  if (!id_estado || !id_clinica || !usuario_email) {
    return res.status(400).json({ error: "Faltan campos obligatorios para actualizar" });
  }

  try {
    const pool = await connectDB();

    const actualResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT e.id_empleado, e.nombre, e.id_estado,
               est.descripcion AS estado,
               c.nombre_clinica AS clinica
        FROM Empleado e
        INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado
        INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
        WHERE e.id_empleado = @id
      `);

    if (actualResult.recordset.length === 0)
      return res.status(404).json({ error: "Empleado no encontrado" });

    const actual = actualResult.recordset[0];

    const estadoNuevoRes = await pool
      .request()
      .input("id_estado", sql.Int, id_estado)
      .query("SELECT descripcion FROM Estado_empleado WHERE id_estado = @id_estado");

    const estadoNuevo = estadoNuevoRes.recordset[0].descripcion;

    let updateFechaSalida = "";
    if (["Despedido", "Renuncia"].includes(estadoNuevo)) {
      updateFechaSalida = ", fecha_salida = GETDATE()";
    } else if (estadoNuevo === "Activo") {
      updateFechaSalida = ", fecha_salida = NULL";
    }

    await pool
      .request()
      .input("id_estado", sql.Int, id_estado)
      .input("id_clinica", sql.Int, id_clinica)
      .input("id", sql.Int, id)
      .query(`
        UPDATE Empleado
        SET id_estado = @id_estado,
            id_clinica = @id_clinica
            ${updateFechaSalida}
        WHERE id_empleado = @id
      `);

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, usuario_email)
      .query("SELECT id_empleado, nombre FROM Empleado WHERE correo = @correo");

    if (usuarioResult.recordset.length === 0)
      return res.status(404).json({ error: "Usuario activo no encontrado" });

    const usuarioActual = usuarioResult.recordset[0];

    const clinicaNueva = await pool
      .request()
      .input("id_clinica", sql.Int, id_clinica)
      .query("SELECT nombre_clinica FROM Clinica WHERE id_clinica = @id_clinica");

    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "actualizado")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input(
        "detalles",
        sql.VarChar,
        `El usuario ${usuarioActual.nombre} ha actualizado a ${actual.nombre} los campos: Estado de ${actual.estado} a ${estadoNuevo} y Clínica de ${actual.clinica} a ${clinicaNueva.recordset[0].nombre_clinica}`
      )
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Error al actualizar empleado:", err);
    res.status(500).json({ error: "Error al actualizar empleado" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { usuario_email } = req.body;

  if (!usuario_email)
    return res.status(400).json({ error: "Falta usuario_email para registro de acción" });

  try {
    const pool = await connectDB();

    const empleadoResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT nombre FROM Empleado WHERE id_empleado = @id");

    if (empleadoResult.recordset.length === 0)
      return res.status(404).json({ error: "Empleado no encontrado" });

    const empleado = empleadoResult.recordset[0];

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, usuario_email)
      .query("SELECT id_empleado, nombre FROM Empleado WHERE correo = @correo");

    if (usuarioResult.recordset.length === 0)
      return res.status(404).json({ error: "Usuario activo no encontrado" });

    const usuarioActual = usuarioResult.recordset[0];

    await pool.request().input("id", sql.Int, id).query("DELETE FROM Empleado WHERE id_empleado = @id");

    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "eliminado")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input("detalles", sql.VarChar, `El usuario ${usuarioActual.nombre} ha eliminado al empleado ${empleado.nombre}`)
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("Error al eliminar empleado:", err);
    res.status(500).json({ error: "Error al eliminar empleado" });
  }
});

export default router;
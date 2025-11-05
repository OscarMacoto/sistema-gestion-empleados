import express from "express";
import sql from "mssql";
import { connectDB } from "../db.js";
import ExcelJS from "exceljs";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configuración de multer para subir archivos Excel
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos Excel"), false);
    }
  },
});
if (!fs.existsSync(path.join(process.cwd(), "uploads"))) {
  fs.mkdirSync(path.join(process.cwd(), "uploads"));
}

// Convierte cualquier celda de Excel a string
const cellToString = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v.text) return String(v.text).trim();
    if (v.richText && Array.isArray(v.richText))
      return v.richText.map((r) => r.text).join("").trim();
    if (v.result) return String(v.result).trim();
    if (v instanceof Date) return v.toISOString();
    return JSON.stringify(v);
  }
  return String(v).trim();
};

//GET EMPLEADOS + PAGINACIOM
router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const request = pool.request();
    request.input("offset", sql.Int, offset);
    request.input("limit", sql.Int, limit);

    const result = await request.query(`
      SELECT e.id_empleado, e.nombre, e.DNI, e.correo, e.fecha_ingreso,
             e.telefono, e.direccion,
             c.nombre_clinica AS clinica,
             est.descripcion AS estado,
             e.fecha_salida,
             e.foto
      FROM Empleado e
      INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
      INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado
      ORDER BY e.id_empleado
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    const empleados = result.recordset.map(emp => ({
      ...emp,
      foto: emp.foto ? Buffer.from(emp.foto).toString("base64") : null
    }));

    const totalResult = await pool.request().query("SELECT COUNT(*) AS total FROM Empleado");
    const total = totalResult.recordset[0].total ?? 0;

    res.json({
      empleados,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error al obtener empleados:", err);
    res.status(500).json({ error: "Error al obtener empleados" });
  }
});

// GET ESTADOS
router.get("/estados/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;
    const result = await pool.request().query("SELECT * FROM Estado_empleado");
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener estados" });
  }
});

// GET CLINICAS
router.get("/clinicas/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;
    const result = await pool.request().query("SELECT * FROM Clinica");
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener clínicas" });
  }
});

// ADD EMPLEADOS
router.post("/", async (req, res) => {
  const { nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, usuario_email, foto } = req.body;

  if (!nombre || !DNI || !correo || !id_estado || !id_clinica || !usuario_email) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;
    const fotoBuffer = foto ? Buffer.from(foto, "base64") : null;

    const insertResult = await pool
      .request()
      .input("nombre", sql.VarChar, String(nombre))
      .input("DNI", sql.VarChar, String(DNI))
      .input("correo", sql.VarChar, String(correo))
      .input("telefono", sql.VarChar, String(telefono || ""))
      .input("direccion", sql.VarChar, String(direccion || ""))
      .input("id_estado", sql.Int, Number(id_estado))
      .input("id_clinica", sql.Int, Number(id_clinica))
      .input("foto", sql.VarBinary(sql.MAX), fotoBuffer)
      .query(`
        INSERT INTO Empleado (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, fecha_ingreso, foto)
        VALUES (@nombre, @DNI, @correo, @telefono, @direccion, @id_estado, @id_clinica, GETDATE(), @foto);
        SELECT SCOPE_IDENTITY() AS id_empleado;
      `);

    const nuevoEmpleadoId = insertResult.recordset[0].id_empleado;

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, String(usuario_email))
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

    res.json({ success: true, message: "Empleado agregado correctamente", id_empleado: nuevoEmpleadoId });
  } catch (err) {
    console.error("Error al agregar empleado:", err);
    res.status(500).json({ error: "Error al agregar empleado" });
  }
});

// UDPDATE EMPLEADO
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { id_estado, id_clinica, usuario_email, foto } = req.body;

  if (!id_estado || !id_clinica || !usuario_email)
    return res.status(400).json({ error: "Faltan campos obligatorios para actualizar" });

  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const actualResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT e.id_empleado, e.nombre, e.fecha_salida,
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

    const estadoNuevo = await pool
      .request()
      .input("id_estado", sql.Int, id_estado)
      .query("SELECT descripcion FROM Estado_empleado WHERE id_estado = @id_estado");

    const clinicaNueva = await pool
      .request()
      .input("id_clinica", sql.Int, id_clinica)
      .query("SELECT nombre_clinica FROM Clinica WHERE id_clinica = @id_clinica");

    const nuevoEstadoDesc = (estadoNuevo.recordset[0]?.descripcion || "").trim().toLowerCase();

    let fechaSalidaClause = "";
    if (["despedido", "renuncia"].includes(nuevoEstadoDesc)) fechaSalidaClause = "fecha_salida = GETDATE()";
    else if (["activo", "on leave", "onleave"].includes(nuevoEstadoDesc)) fechaSalidaClause = "fecha_salida = NULL";

    const fotoBuffer = foto ? Buffer.from(foto, "base64") : null;
    const updates = [];
    if (fechaSalidaClause) updates.push(fechaSalidaClause);
    updates.push("id_estado = @id_estado");
    updates.push("id_clinica = @id_clinica");
    if (fotoBuffer) updates.push("foto = @foto");

    const updateQuery = `UPDATE Empleado SET ${updates.join(", ")} WHERE id_empleado = @id`;

    const request = pool.request()
      .input("id_estado", sql.Int, id_estado)
      .input("id_clinica", sql.Int, id_clinica)
      .input("id", sql.Int, id);

    if (fotoBuffer) request.input("foto", sql.VarBinary(sql.MAX), fotoBuffer);
    await request.query(updateQuery);

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, String(usuario_email))
      .query("SELECT id_empleado, nombre FROM Empleado WHERE correo = @correo");

    if (usuarioResult.recordset.length === 0)
      return res.status(404).json({ error: "Usuario activo no encontrado" });

    const usuarioActual = usuarioResult.recordset[0];

    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "actualizado")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input(
        "detalles",
        sql.VarChar,
        `El usuario ${usuarioActual.nombre} ha actualizado a ${actual.nombre} cambiando el Estado de ${actual.estado} a ${estadoNuevo.recordset[0].descripcion} y la Clínica de ${actual.clinica} a ${clinicaNueva.recordset[0].nombre_clinica}`
      )
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true, message: "Empleado actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar empleado:", err);
    res.status(500).json({ error: "Error al actualizar empleado" });
  }
});

// DELETE EMPLEADO
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { usuario_email } = req.body;

  if (!usuario_email)
    return res.status(400).json({ error: "Falta usuario_email para registro de acción" });

  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    await pool.request().input("id", sql.Int, id).query("DELETE FROM Historial_clinica WHERE id_empleado = @id");
    await pool.request().input("id", sql.Int, id).query("DELETE FROM CuentaSSO WHERE id_empleado = @id");

    const empleadoResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT nombre FROM Empleado WHERE id_empleado = @id");

    if (empleadoResult.recordset.length === 0)
      return res.status(404).json({ error: "Empleado no encontrado" });

    const empleado = empleadoResult.recordset[0];

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, String(usuario_email))
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

    res.json({ success: true, message: "Empleado eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar empleado:", err);
    res.status(500).json({ error: "Error al eliminar empleado" });
  }
});

// EXPORT EMPLEADOS EXCEL
router.get("/exportar", async (req, res) => {
  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const result = await pool.request().query(`
      SELECT e.id_empleado, e.nombre, e.DNI, e.correo, e.fecha_ingreso, e.fecha_salida,
             e.telefono, e.direccion,
             c.nombre_clinica AS clinica,
             est.descripcion AS estado
      FROM Empleado e
      INNER JOIN Clinica c ON e.id_clinica = c.id_clinica
      INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado
    `);

    const empleados = result.recordset;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Empleados");

    worksheet.columns = [
      { header: "ID", key: "id_empleado", width: 10 },
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "DNI", key: "DNI", width: 15 },
      { header: "Correo", key: "correo", width: 25 },
      { header: "Fecha Ingreso", key: "fecha_ingreso", width: 15 },
      { header: "Fecha Salida", key: "fecha_salida", width: 15 },
      { header: "Teléfono", key: "telefono", width: 15 },
      { header: "Dirección", key: "direccion", width: 25 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Clínica", key: "clinica", width: 20 },
    ];

    empleados.forEach(emp => {
      worksheet.addRow({
        id_empleado: emp.id_empleado,
        nombre: emp.nombre,
        DNI: emp.DNI,
        correo: emp.correo,
        fecha_ingreso: emp.fecha_ingreso ? emp.fecha_ingreso.toISOString().split("T")[0] : "",
        fecha_salida: emp.fecha_salida ? emp.fecha_salida.toISOString().split("T")[0] : "",
        telefono: emp.telefono,
        direccion: emp.direccion,
        estado: emp.estado,
        clinica: emp.clinica
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Empleados.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error al exportar Excel:", err);
    res.status(500).json({ error: "Error al exportar Excel" });
  }
});

// IMPORT EMPLEADOS EXCEL
router.post("/importar", upload.single("archivo"), async (req, res) => {
  const { usuario_email } = req.body;
  if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });
  if (!usuario_email) return res.status(400).json({ error: "Falta usuario_email" });

  const filePath = req.file.path;

  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 60000;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    const empleadosAgregados = [];

    const usuarioResult = await pool
      .request()
      .input("correo", sql.VarChar, String(usuario_email))
      .query("SELECT id_empleado, nombre FROM Empleado WHERE correo = @correo");

    if (usuarioResult.recordset.length === 0) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(404).json({ error: "Usuario activo no encontrado" });
    }
    const usuarioActual = usuarioResult.recordset[0];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const nombre = cellToString(row.getCell(1).value);
      const DNI = cellToString(row.getCell(2).value);
      const correo = cellToString(row.getCell(3).value);
      const fechaIngresoRaw = row.getCell(4).value;
      const fechaSalidaRaw = row.getCell(5).value;
      const telefono = cellToString(row.getCell(6).value || "");
      const direccion = cellToString(row.getCell(7).value || "");
      const id_estado = Number(row.getCell(8).value);
      const id_clinica = Number(row.getCell(9).value);

      if (!nombre || !DNI || !correo || !id_estado || !id_clinica) continue;

      const existe = await pool
        .request()
        .input("DNI", sql.VarChar, DNI)
        .input("correo", sql.VarChar, correo)
        .query(`SELECT COUNT(*) AS existe FROM Empleado WHERE DNI = @DNI OR correo = @correo`);

      if (existe.recordset[0].existe > 0) continue;

      let fecha_ingreso = null;
      let fecha_salida = null;

      if (fechaIngresoRaw) fecha_ingreso = fechaIngresoRaw instanceof Date ? fechaIngresoRaw : new Date(cellToString(fechaIngresoRaw));
      if (fechaSalidaRaw) fecha_salida = fechaSalidaRaw instanceof Date ? fechaSalidaRaw : new Date(cellToString(fechaSalidaRaw));

      const insertResult = await pool
        .request()
        .input("nombre", sql.VarChar, nombre)
        .input("DNI", sql.VarChar, DNI)
        .input("correo", sql.VarChar, correo)
        .input("telefono", sql.VarChar, telefono)
        .input("direccion", sql.VarChar, direccion)
        .input("id_estado", sql.Int, id_estado)
        .input("id_clinica", sql.Int, id_clinica)
        .input("fecha_ingreso", sql.Date, fecha_ingreso)
        .input("fecha_salida", sql.Date, fecha_salida)
        .query(`
          INSERT INTO Empleado 
          (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, fecha_ingreso, fecha_salida)
          VALUES (@nombre, @DNI, @correo, @telefono, @direccion, @id_estado, @id_clinica, @fecha_ingreso, @fecha_salida);
          SELECT SCOPE_IDENTITY() AS id_empleado;
        `);

      const nuevoEmpleadoId = insertResult.recordset[0].id_empleado;

      await pool
        .request()
        .input("id_empleado", sql.Int, usuarioActual.id_empleado)
        .input("accion", sql.VarChar, "importado")
        .input("usuario", sql.VarChar, usuarioActual.nombre)
        .input("detalles", sql.VarChar, `El usuario ${usuarioActual.nombre} ha importado al empleado ${nombre}`)
        .query(`
          INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
          VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
        `);

      empleadosAgregados.push(nombre);
    }

    try { fs.unlinkSync(filePath); } catch (e) {}

    res.json({ success: true, message: `Empleados importados correctamente: ${empleadosAgregados.join(", ")}` });
  } catch (err) {
    console.error("Error al importar Excel:", err);
    try { fs.unlinkSync(filePath); } catch (e) {}
    res.status(500).json({ error: "Error al importar Excel" });
  }
});

export default router;

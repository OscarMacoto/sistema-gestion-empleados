import express from "express";
import sql from "mssql";
import { connectDB } from "../db.js";
import ExcelJS from "exceljs";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
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

async function getUsuarioByEmail(pool, correo) {
  if (!correo) return null;
  const result = await pool
    .request()
    .input("correo", sql.VarChar, String(correo))
    .query(`
      SELECT e.id_empleado, e.nombre, e.id_rol, r.descripcion AS rol_descripcion
      FROM Empleado e
      LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
      WHERE e.correo = @correo
    `);
  return result.recordset[0] ?? null;
}

async function verificarRoles(pool, usuario_email, allowed = []) {
  if (!usuario_email) return { ok: false, error: "Falta usuario_email" };
  const usuario = await getUsuarioByEmail(pool, usuario_email);
  if (!usuario) return { ok: false, error: "Usuario no encontrado" };
  if (allowed.length === 0) return { ok: true, usuario };
  const rolDesc = (usuario.rol_descripcion || "").trim();
  if (allowed.includes(rolDesc)) return { ok: true, usuario };
  return { ok: false, error: "Acceso denegado" };
}

const PERMS = {
  ADMIN: "Administrador",
  RRHH: "RRHH",
  EMPLEADO: "Empleado de planta",
};

// RUTAS

router.get("/email/:correo", async (req, res) => {
  try {
    const correo = req.params.correo;
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("correo", sql.VarChar, correo)
      .query("SELECT id_empleado, nombre, correo, id_rol FROM Empleado WHERE correo = @correo");
    if (!result.recordset.length) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("GET /email/:correo error:", err);
    res.status(500).json({ error: "Error al obtener empleado" });
  }
});

router.get("/rol/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const pool = await connectDB();
    const usuario = await getUsuarioByEmail(pool, email);
    if (!usuario) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json({ id_empleado: usuario.id_empleado, nombre: usuario.nombre, descripcion: usuario.rol_descripcion });
  } catch (err) {
    console.error("GET /rol/:email error:", err);
    res.status(500).json({ error: "Error al obtener rol" });
  }
});

router.get("/estados/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Estado_empleado");
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /estados/lista error:", err);
    res.status(500).json({ error: "Error al obtener estados" });
  }
});

router.get("/clinicas/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Clinica");
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /clinicas/lista error:", err);
    res.status(500).json({ error: "Error al obtener clínicas" });
  }
});

router.get("/roles/lista", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Rol_empleado ORDER BY id_rol");
    res.json(result.recordset);
  } catch (err) {
    console.error("GET /roles/lista error:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

// Registrar acción

router.post("/registrarAccion", async (req, res) => {
  try {
    const { usuario_email, accion, detalles } = req.body;
    if (!usuario_email || !accion) return res.status(400).json({ error: "Faltan campos" });

    const pool = await connectDB();
    const usuario = await getUsuarioByEmail(pool, usuario_email);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    await pool
      .request()
      .input("id_empleado", sql.Int, usuario.id_empleado)
      .input("accion", sql.VarChar, accion)
      .input("usuario", sql.VarChar, usuario.nombre)
      .input("detalles", sql.NVarChar, detalles || "")
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true });
  } catch (err) {
    console.error("POST /registrarAccion error:", err);
    res.status(500).json({ error: "Error al registrar acción" });
  }
});

// EXPORTAR EXCEL

async function generarExcelEmpleados(empleadosList, res, filename = "Empleados.xlsx") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Empleados");
  worksheet.columns = [
    { header: "ID", key: "id_empleado", width: 10 },
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "DNI", key: "DNI", width: 20 },
    { header: "Correo", key: "correo", width: 30 },
    { header: "Fecha Ingreso", key: "fecha_ingreso", width: 15 },
    { header: "Fecha Salida", key: "fecha_salida", width: 15 },
    { header: "Teléfono", key: "telefono", width: 15 },
    { header: "Dirección", key: "direccion", width: 30 },
    { header: "Estado", key: "estado", width: 20 },
    { header: "Clínica", key: "clinica", width: 25 },
    { header: "Rol", key: "rol", width: 20 },
  ];

  empleadosList.forEach(emp => {
    worksheet.addRow({
      id_empleado: emp.id_empleado,
      nombre: emp.nombre,
      DNI: emp.DNI,
      correo: emp.correo,
      fecha_ingreso: emp.fecha_ingreso ? new Date(emp.fecha_ingreso).toISOString().split("T")[0] : "",
      fecha_salida: emp.fecha_salida ? new Date(emp.fecha_salida).toISOString().split("T")[0] : "",
      telefono: emp.telefono,
      direccion: emp.direccion,
      estado: emp.estado,
      clinica: emp.clinica,
      rol: emp.rol,
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

router.get("/exportar", async (req, res) => {
  try {
    const { usuario_email, nombre, estado, clinica } = req.query;

    const pool = await connectDB();

    const auth = await verificarRoles(pool, usuario_email, [
      PERMS.ADMIN,
      PERMS.RRHH,
    ]);
    if (!auth.ok) return res.status(403).json({ error: auth.error });

    const usuarioActual = auth.usuario;

    // FILTROS
    const whereClauses = [];
    const request = pool.request();

    if (estado) {
      whereClauses.push("e.id_estado = @estado");
      request.input("estado", sql.Int, Number(estado));
    }

    if (clinica) {
      whereClauses.push("e.id_clinica = @clinica");
      request.input("clinica", sql.Int, Number(clinica));
    }

    if (nombre?.trim()) {
      whereClauses.push("LOWER(e.nombre) LIKE '%' + LOWER(@nombre) + '%'");
      request.input("nombre", sql.VarChar, nombre.trim());
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const query = `
      SELECT 
        e.id_empleado,
        e.nombre,
        e.DNI,
        e.correo,
        e.fecha_ingreso,
        e.fecha_salida,
        e.telefono,
        e.direccion,
        c.nombre_clinica AS clinica,
        est.descripcion AS estado,
        r.descripcion AS rol
      FROM Empleado e
      LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
      LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
      LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
      ${whereSQL}
      ORDER BY e.id_empleado
    `;

    const result = await request.query(query);

    // REGISTRAR ACCIÓN
    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "Exportar Empleados")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input(
        "detalles",
        sql.NVarChar,
        `El usuario ${usuarioActual.nombre} exportó ${
          whereClauses.length ? "empleados filtrados" : "todos los empleados"
        }`
      )
      .query(`
        INSERT INTO RRHH_RegistroAcciones
          (id_empleado, accion, fecha, usuario, detalles)
        VALUES
          (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    // GENERAR EXCEL

    await generarExcelEmpleados(result.recordset, res);

  } catch (err) {
    console.error("GET /exportar error:", err);
    res.status(500).json({ error: "Error al exportar Excel" });
  }
});


router.get("/mi-perfil/:correo", async (req, res) => {
  const { correo } = req.params;
  if (!correo) return res.status(400).json({ error: "Falta correo del usuario" });

  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input("correo", sql.VarChar, correo)
      .query(`
        SELECT e.id_empleado, e.nombre, e.correo, e.DNI, e.telefono,
               c.nombre_clinica AS clinica,
               est.descripcion AS estado,
               e.fecha_ingreso
        FROM Empleado e
        LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
        LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
        WHERE e.correo = @correo
      `);

    if (!result.recordset.length) return res.status(404).json({ error: "Empleado no encontrado" });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("GET /mi-perfil error:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// LISTA

router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      nombre,
      estado,
      clinica,
      usuario_email
    } = req.query;

    const pool = await connectDB();
    const offset = (page - 1) * limit;

    const whereClauses = [];
    if (estado) whereClauses.push("e.id_estado = @estado");
    if (clinica) whereClauses.push("e.id_clinica = @clinica");
    if (nombre)
      whereClauses.push("LOWER(e.nombre) LIKE '%' + LOWER(@nombre) + '%'");

    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const totalReq = pool.request();
    if (estado) totalReq.input("estado", sql.Int, estado);
    if (clinica) totalReq.input("clinica", sql.Int, clinica);
    if (nombre) totalReq.input("nombre", sql.VarChar, nombre);

    const totalResult = await totalReq.query(`
      SELECT COUNT(*) AS total
      FROM Empleado e
      ${whereSql}
    `);

    const total = totalResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);
    const dataReq = pool.request();
    if (estado) dataReq.input("estado", sql.Int, estado);
    if (clinica) dataReq.input("clinica", sql.Int, clinica);
    if (nombre) dataReq.input("nombre", sql.VarChar, nombre);

    dataReq.input("limit", sql.Int, Number(limit));
    dataReq.input("offset", sql.Int, offset);

    const data = await dataReq.query(`
      SELECT e.id_empleado, e.nombre, e.DNI, e.correo, e.telefono,
             e.direccion, e.fecha_ingreso, e.fecha_salida,
             est.descripcion AS estado,
             c.nombre_clinica AS clinica,
             r.descripcion AS rol
      FROM Empleado e
      LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
      LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
      LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
      ${whereSql}
      ORDER BY e.id_empleado
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      empleados: data.recordset,
      totalPages,
    });

  } catch (err) {
    console.error("GET /empleados error:", err);
    res.status(500).json({ error: "Error al obtener empleados" });
  }
});


// CREAR empleado (POST /)

router.post("/", async (req, res) => {
  try {
    const {
      nombre, DNI, correo, fecha_ingreso,
      telefono, direccion, id_estado, id_clinica, id_rol,
      foto, usuario_email,
    } = req.body;

    if (!nombre || !DNI || !correo || !id_estado || !id_clinica || !usuario_email) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) return res.status(403).json({ error: auth.error });
    const usuarioActual = auth.usuario;

    const fotoBuffer = foto ? Buffer.from(foto, "base64") : null;

    // VALIDAR DNI O CORREO DUPLICADOS
    const existeEmpleado = await pool
      .request()
      .input("DNI", sql.VarChar, String(DNI))
      .input("correo", sql.VarChar, String(correo))
      .query(`
        SELECT 
          SUM(CASE WHEN DNI = @DNI THEN 1 ELSE 0 END) AS existeDNI,
          SUM(CASE WHEN correo = @correo THEN 1 ELSE 0 END) AS existeCorreo
        FROM Empleado
      `);

    const { existeDNI, existeCorreo } = existeEmpleado.recordset[0];

    if (existeDNI > 0) {
      return res.status(409).json({ error: "El DNI ya existe actualmente." });
    }

    if (existeCorreo > 0) {
      return res.status(409).json({ error: "El correo ya existe actualmente." });
    }

    const insertResult = await pool
      .request()
      .input("nombre", sql.VarChar, String(nombre))
      .input("DNI", sql.VarChar, String(DNI))
      .input("correo", sql.VarChar, String(correo))
      .input("telefono", sql.VarChar, String(telefono || ""))
      .input("direccion", sql.VarChar, String(direccion || ""))
      .input("id_estado", sql.Int, Number(id_estado))
      .input("id_clinica", sql.Int, Number(id_clinica))
      .input("id_rol", sql.Int, Number(id_rol || 3))
      .input("foto", sql.VarBinary(sql.MAX), fotoBuffer)
      .input("fecha_ingreso", sql.Date, fecha_ingreso ? new Date(fecha_ingreso) : null)
      .query(`
        INSERT INTO Empleado (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, id_rol, fecha_ingreso, foto)
        VALUES (@nombre, @DNI, @correo, @telefono, @direccion, @id_estado, @id_clinica, @id_rol, ISNULL(@fecha_ingreso, GETDATE()), @foto);
        SELECT SCOPE_IDENTITY() AS id_empleado;
      `);

    const nuevoEmpleadoId = insertResult.recordset[0]?.id_empleado ?? null;

    if (usuarioActual && usuarioActual.id_empleado) {
      await pool
        .request()
        .input("id_empleado", sql.Int, usuarioActual.id_empleado)
        .input("accion", sql.VarChar, "Agregado")
        .input("usuario", sql.VarChar, usuarioActual.nombre)
        .input("detalles", sql.NVarChar, `El usuario ${usuarioActual.nombre} ha agregado al empleado ${nombre}`)
        .query(`
          INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
          VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
        `);
    }

    res.json({ success: true, message: "Empleado agregado correctamente", id_empleado: nuevoEmpleadoId });
  } catch (err) {
    console.error("POST / error:", err);
    res.status(500).json({ error: "Error al agregar empleado" });
  }
});

// ACTUALIZAR empleado (PUT /:id)

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      DNI,
      correo,
      fecha_ingreso,
      telefono,
      direccion,
      id_estado,
      id_clinica,
      id_rol,
      foto,
      usuario_email,
    } = req.body;

    if (!usuario_email) {
      return res.status(400).json({ error: "Falta usuario_email" });
    }

    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const auth = await verificarRoles(pool, usuario_email, [
      PERMS.ADMIN,
      PERMS.RRHH,
    ]);
    if (!auth.ok) return res.status(403).json({ error: auth.error });

    const usuarioActual = auth.usuario;

    // Obtener estado anterior
    const prev = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT 
          e.id_empleado,
          e.nombre,
          e.id_estado,
          est.descripcion AS estado,
          c.nombre_clinica AS clinica,
          r.descripcion AS rol
        FROM Empleado e
        LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
        LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
        LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
        WHERE e.id_empleado = @id
      `);

    if (!prev.recordset.length) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    const anterior = prev.recordset[0];

    const updates = [];
    const request = pool.request().input("id", sql.Int, Number(id));

    if (nombre !== undefined) {
      updates.push("nombre = @nombre");
      request.input("nombre", sql.VarChar, nombre);
    }

    if (DNI !== undefined) {
      updates.push("DNI = @DNI");
      request.input("DNI", sql.VarChar, DNI);
    }

    if (correo !== undefined) {
      updates.push("correo = @correo");
      request.input("correo", sql.VarChar, correo);
    }

    if (fecha_ingreso !== undefined) {
      updates.push("fecha_ingreso = @fecha_ingreso");
      request.input(
        "fecha_ingreso",
        sql.Date,
        fecha_ingreso ? new Date(fecha_ingreso) : null
      );
    }

    if (telefono !== undefined) {
      updates.push("telefono = @telefono");
      request.input("telefono", sql.VarChar, telefono);
    }

    if (direccion !== undefined) {
      updates.push("direccion = @direccion");
      request.input("direccion", sql.VarChar, direccion);
    }

    const ESTADOS_CON_SALIDA = [2, 3]; // Renuncia, Despedido

      if (id_estado !== undefined) {
        updates.push(`
          id_estado = @id_estado,
          fecha_salida = ${
            ESTADOS_CON_SALIDA.includes(Number(id_estado))
              ? "CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Central America Standard Time' AS DATE)"
              : "NULL"
          }
        `);
        request.input("id_estado", sql.Int, Number(id_estado));
      }


    if (id_clinica !== undefined) {
      updates.push("id_clinica = @id_clinica");
      request.input("id_clinica", sql.Int, Number(id_clinica));
    }

    if (id_rol !== undefined) {
      updates.push("id_rol = @id_rol");
      request.input("id_rol", sql.Int, Number(id_rol));
    }

    if (foto !== undefined && foto !== null) {
      updates.push("foto = @foto");
      request.input("foto", sql.VarBinary(sql.MAX), Buffer.from(foto, "base64"));
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const updateQuery = `
      UPDATE Empleado
      SET ${updates.join(", ")}
      WHERE id_empleado = @id
    `;

    await request.query(updateQuery);

    // Registrar acción
    const detalles = `El usuario ${usuarioActual.nombre} actualizó al empleado ${anterior.nombre}`;

    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "Actualizado")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input("detalles", sql.NVarChar, detalles)
      .query(`
        INSERT INTO RRHH_RegistroAcciones 
        (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true, message: "Empleado actualizado correctamente" });
  } catch (err) {
    console.error("PUT /:id error:", err);
    res.status(500).json({ error: "Error al actualizar empleado" });
  }
});


// ELIMINAR empleado (DELETE /:id)

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_email = req.body?.usuario_email || req.query?.usuario_email || req.headers["x-usuario-email"] || "";
    if (!usuario_email) return res.status(400).json({ error: "Falta usuario_email para registro de acción" });

    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) return res.status(403).json({ error: auth.error });
    const usuarioActual = auth.usuario;

    const empleadoRes = await pool.request().input("id", sql.Int, Number(id)).query("SELECT nombre FROM Empleado WHERE id_empleado = @id");
    if (!empleadoRes.recordset || empleadoRes.recordset.length === 0) return res.status(404).json({ error: "Empleado no encontrado" });
    const empleado = empleadoRes.recordset[0];

    await pool.request().input("id", sql.Int, Number(id)).query("DELETE FROM Historial_clinica WHERE id_empleado = @id");
    await pool.request().input("id", sql.Int, Number(id)).query("DELETE FROM CuentaSSO WHERE id_empleado = @id");
    await pool.request().input("id", sql.Int, Number(id)).query("DELETE FROM Empleado WHERE id_empleado = @id");

    // Registrar acción
    const detalles = `El usuario ${usuarioActual.nombre} ha eliminado al empleado ${empleado.nombre}`;
    await pool
      .request()
      .input("id_empleado", sql.Int, usuarioActual.id_empleado)
      .input("accion", sql.VarChar, "Eliminado")
      .input("usuario", sql.VarChar, usuarioActual.nombre)
      .input("detalles", sql.NVarChar, detalles)
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
      `);

    res.json({ success: true, message: "Empleado eliminado correctamente" });
  } catch (err) {
    console.error("DELETE /:id error:", err);
    res.status(500).json({ error: "Error al eliminar empleado" });
  }
});

// IMPORTAR empleados desde Excel (POST /importar)

const normalizarDNI = (dni) => (dni ? dni.replace(/[\s-]/g, "") : "");

router.post("/importar", upload.single("archivo"), async (req, res) => {
  const { usuario_email } = req.body;
  if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });
  if (!usuario_email) return res.status(400).json({ error: "Falta usuario_email" });

  const filePath = req.file.path;
  try {
    const pool = await connectDB();
    pool.config.requestTimeout = 60000;

    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(403).json({ error: auth.error });
    }
    const usuarioActual = auth.usuario;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    const empleadosAgregados = [];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const nombre = cellToString(row.getCell(1).value);
      const DNIraw = cellToString(row.getCell(2).value);
      const DNI = normalizarDNI(DNIraw); // <--- normalización aquí
      const correo = cellToString(row.getCell(3).value);
      const fechaIngCell = row.getCell(4).value;
      const fechaSalCell = row.getCell(5).value;
      const telefono = cellToString(row.getCell(6).value || "");
      const direccion = cellToString(row.getCell(7).value || "");
      const id_estado = Number(cellToString(row.getCell(8).value || "1"));
      const id_clinica = Number(cellToString(row.getCell(9).value || "1"));
      const id_rol = Number(cellToString(row.getCell(10).value || "3"));
      const fotoBase64 = cellToString(row.getCell(11).value) || null;
      const fotoBuffer = fotoBase64 ? Buffer.from(fotoBase64, "base64") : null;

      if (!nombre || !DNI || !correo) continue;

      const existe = await pool
        .request()
        .input("DNI", sql.VarChar, DNI)
        .input("correo", sql.VarChar, correo)
        .query(`
          SELECT COUNT(*) AS existe 
          FROM Empleado 
          WHERE REPLACE(REPLACE(DNI,'-',''),' ','') = @DNI OR correo = @correo
        `);
      if (existe.recordset[0].existe > 0) continue;

      const fecha_ingreso = fechaIngCell instanceof Date ? fechaIngCell : (fechaIngCell ? new Date(cellToString(fechaIngCell)) : null);
      const fecha_salida = fechaSalCell instanceof Date ? fechaSalCell : (fechaSalCell ? new Date(cellToString(fechaSalCell)) : null);

      const insertResult = await pool
        .request()
        .input("nombre", sql.VarChar, nombre)
        .input("DNI", sql.VarChar, DNI)
        .input("correo", sql.VarChar, correo)
        .input("telefono", sql.VarChar, telefono)
        .input("direccion", sql.VarChar, direccion)
        .input("id_estado", sql.Int, id_estado)
        .input("id_clinica", sql.Int, id_clinica)
        .input("id_rol", sql.Int, id_rol)
        .input("fecha_ingreso", sql.Date, fecha_ingreso)
        .input("fecha_salida", sql.Date, fecha_salida)
        .input("foto", sql.VarBinary(sql.MAX), fotoBuffer)
        .query(`
          INSERT INTO Empleado (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, id_rol, fecha_ingreso, fecha_salida, foto)
          VALUES (@nombre, @DNI, @correo, @telefono, @direccion, @id_estado, @id_clinica, @id_rol, ISNULL(@fecha_ingreso, GETDATE()), @fecha_salida, @foto);
          SELECT SCOPE_IDENTITY() AS id_empleado;
        `);

      const nuevoEmpleadoId = insertResult.recordset[0]?.id_empleado ?? null;
      empleadosAgregados.push({ id_empleado: nuevoEmpleadoId, nombre });

      // Registrar acción por cada importado
      await pool
        .request()
        .input("id_empleado", sql.Int, usuarioActual.id_empleado)
        .input("accion", sql.VarChar, "Importado")
        .input("usuario", sql.VarChar, usuarioActual.nombre)
        .input("detalles", sql.NVarChar, `El usuario ${usuarioActual.nombre} ha importado al empleado ${nombre}`)
        .query(`
          INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
          VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
        `);
    }

    try { fs.unlinkSync(filePath); } catch (e) {}
    res.json({ success: true, message: "Archivo importado correctamente", empleados: empleadosAgregados });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    console.error("POST /importar error:", err);
    res.status(500).json({ error: "Error al importar Excel" });
  }
});


export default router;
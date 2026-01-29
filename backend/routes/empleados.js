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

router.get("/email/:correo", async (req, res, next) => {
  try {
    const { correo } = req.params;

    if (!correo) {
      const error = new Error("Falta el correo");
      error.status = 400;
      throw error;
    }
    const pool = await connectDB();
    const result = await pool
      .request()
      .input("correo", sql.VarChar, correo)
      .query(`
        SELECT id_empleado, nombre, correo, id_rol
        FROM Empleado
        WHERE correo = @correo
      `);

    if (!result.recordset.length) {
      const error = new Error("Empleado no encontrado");
      error.status = 404;
      throw error;
    }

    res.json(result.recordset[0]);
  } catch (err) {
    err.context = "GET /empleados/email/:correo";
    next(err);
  }
});


router.get("/rol/:email", async (req, res, next) => {
  try {
    const email = req.params.email;
    const pool = await connectDB();
    const usuario = await getUsuarioByEmail(pool, email);

    if (!usuario) {
      const err = new Error("Empleado no encontrado");
      err.status = 404;
      throw err;
    }

    res.json({
      id_empleado: usuario.id_empleado,
      nombre: usuario.nombre,
      descripcion: usuario.rol_descripcion,
    });
  } catch (err) {
    err.context = "GET /empleados/rol/:email";
    next(err);
  }
});

router.get("/estados/lista", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Estado_empleado");

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err) {
    err.context = "GET /empleados/estados/lista";
    next(err);
  }
});

router.get("/clinicas/lista", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Clinica");

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err) {
    err.context = "GET /empleados/clinicas/lista";
    next(err);
  }
});


router.get("/roles/lista", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Rol_empleado ORDER BY id_rol");

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err) {
    err.context = "GET /empleados/roles/lista";
    next(err);
  }
});


router.get("/areas/lista", async (req, res, next) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Area ORDER BY id_area");

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (err) {
    err.context = "GET /empleados/areas/lista";
    next(err);
  }
});


// Registrar acción


router.post("/registrarAccion", async (req, res, next) => {
  try {
    const { usuario_email, accion, detalles } = req.body;

    if (!usuario_email || !accion) {
      const err = new Error("Faltan campos obligatorios");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();
    const usuario = await getUsuarioByEmail(pool, usuario_email);

    if (!usuario) {
      const err = new Error("Usuario no encontrado");
      err.status = 404;
      throw err;
    }

    await pool
      .request()
      .input("id_empleado", sql.Int, usuario.id_empleado)
      .input("accion", sql.VarChar, accion)
      .input("usuario", sql.VarChar, usuario.nombre)
      .input("detalles", sql.NVarChar, detalles || "")
      .query(`
        INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, SYSUTCDATETIME(), @usuario, @detalles)
      `);

    res.json({ success: true, message: "Acción registrada correctamente" });
  } catch (err) {
    err.message = err.message || "Error al registrar acción";
    next(err);
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
    { header: "Área", key: "nombre_area", width: 20 },
    { header: "Puesto", key: "puesto", width: 25 }
  ];

  empleadosList.forEach(emp => {
    worksheet.addRow({
      id_empleado: emp.id_empleado,
      nombre: emp.nombre,
      DNI: emp.DNI,
      correo: emp.correo,
      fecha_ingreso: emp.fecha_ingreso
        ? new Date(emp.fecha_ingreso).toISOString().split("T")[0]
        : "",
      fecha_salida: emp.fecha_salida
        ? new Date(emp.fecha_salida).toISOString().split("T")[0]
        : "",
      telefono: emp.telefono,
      direccion: emp.direccion,
      estado: emp.estado,
      clinica: emp.clinica,
      rol: emp.rol,
      nombre_area: emp.nombre_area ?? "",
      puesto: emp.puesto ?? ""
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}


router.get("/exportar", async (req, res, next) => {
  try {
    const { usuario_email, nombre, estado, clinica, area } = req.query;

    const pool = await connectDB();

    const auth = await verificarRoles(pool, usuario_email, [
      PERMS.ADMIN,
      PERMS.RRHH,
    ]);
    if (!auth.ok) {
      const err = new Error(auth.error || "No autorizado");
      err.status = 403;
      throw err;
    }

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
    if (area !== undefined && area !== null && area !== "") {
      const areaNum = Number(area);
      if (!Number.isInteger(areaNum)) {
        const err = new Error("Parámetro 'area' inválido. Debe ser un entero.");
        err.status = 400;
        throw err;
      }
      whereClauses.push("e.id_area = @area");
      request.input("area", sql.Int, areaNum);
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
        r.descripcion AS rol,
        a.nombre_area AS nombre_area,
        e.puesto AS puesto
      FROM Empleado e
      LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
      LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
      LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
      LEFT JOIN Area a ON e.id_area = a.id_area
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
          (@id_empleado, @accion, SYSUTCDATETIME(), @usuario, @detalles)
      `);

    // GENERAR EXCEL
    await generarExcelEmpleados(result.recordset, res);
  } catch (err) {
    err.message = err.message || "Error al exportar Excel";
    err.context = "GET /empleados/exportar";
    next(err);
  }
});
  
router.get("/mi-perfil/:correo", async (req, res, next) => {
  try {
    const { correo } = req.params;

    if (!correo) {
      const err = new Error("Falta correo del usuario");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();
    
const result = await pool.request()
  .input("correo", sql.VarChar, correo)
  .query(`
    SELECT 
      e.id_empleado, 
      e.nombre, 
      e.correo, 
      e.DNI, 
      e.telefono,
      c.nombre_clinica AS clinica,
      est.descripcion AS estado,
      e.fecha_ingreso,
      a.nombre_area AS nombre_area,
      e.puesto AS puesto
    FROM Empleado e
    LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
    LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
    LEFT JOIN Area a ON e.id_area = a.id_area
    WHERE e.correo = @correo
  `);


    if (!result.recordset.length) {
      const err = new Error("Empleado no encontrado");
      err.status = 404;
      throw err;
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (err) {
    err.message = err.message || "Error al obtener perfil";
    next(err);
  }
});


router.get("/:id", async (req, res, next) => {
    try {
      const { id } = req.params;

      const pool = await connectDB();
      const result = await pool.request()
        .input("id", sql.Int, id)
        .query(`
          SELECT
            e.id_empleado,
            e.nombre,
            e.DNI,
            e.correo,
            e.telefono,
            e.direccion,
            e.id_estado,
            e.id_clinica,
            e.id_rol,
            e.id_area,
            e.puesto,
            e.fecha_ingreso,
            e.fecha_salida,
            e.foto
          FROM Empleado e
          WHERE e.id_empleado = @id
        `);

      if (!result.recordset.length) {
        return res.status(404).json({ error: "Empleado no encontrado" });
      }
      const emp = result.recordset[0];
      emp.foto = emp.foto ? Buffer.from(emp.foto).toString("base64") : null;
      res.json(emp);
    } catch (err) {
      err.context = "GET /empleados/:id";
      next(err);
    }
  });

// LISTA
router.get("/", async (req, res, next) => {
  try {
    let { page = 1, limit = 10, nombre, estado, clinica, area, usuario_email } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page < 1) {
      const err = new Error("Parámetro 'page' inválido. Debe ser un entero >= 1.");
      err.status = 400;
      throw err;
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      const err = new Error("Parámetro 'limit' inválido. Debe ser un entero entre 1 y 1000.");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const totalReq = pool.request();
    const dataReq = pool.request();

    // Filtro por estado
    if (estado !== undefined && estado !== null && estado !== "") {
      const estadoNum = Number(estado);
      if (!Number.isInteger(estadoNum)) {
        const err = new Error("Parámetro 'estado' inválido. Debe ser un entero.");
        err.status = 400;
        throw err;
      }
      whereClauses.push("e.id_estado = @estado");
      totalReq.input("estado", sql.Int, estadoNum);
      dataReq.input("estado", sql.Int, estadoNum);
    }

    // Filtro por clínica
    if (clinica !== undefined && clinica !== null && clinica !== "") {
      const clinicaNum = Number(clinica);
      if (!Number.isInteger(clinicaNum)) {
        const err = new Error("Parámetro 'clinica' inválido. Debe ser un entero.");
        err.status = 400;
        throw err;
      }
      whereClauses.push("e.id_clinica = @clinica");
      totalReq.input("clinica", sql.Int, clinicaNum);
      dataReq.input("clinica", sql.Int, clinicaNum);
    }

    // Filtro por área
    if (area !== undefined && area !== null && area !== "") {
      const areaNum = Number(area);
      if (!Number.isInteger(areaNum)) {
        const err = new Error("Parámetro 'area' inválido. Debe ser un entero.");
        err.status = 400;
        throw err;
      }
      whereClauses.push("e.id_area = @area");
      totalReq.input("area", sql.Int, areaNum);
      dataReq.input("area", sql.Int, areaNum);
    }

    if (typeof nombre === "string" && nombre.trim() !== "") {
      const nombreTrim = nombre.trim();
      whereClauses.push("LOWER(e.nombre) LIKE '%' + LOWER(@nombre) + '%'");
      totalReq.input("nombre", sql.VarChar, nombreTrim);
      dataReq.input("nombre", sql.VarChar, nombreTrim);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const totalResult = await totalReq.query(`
      SELECT COUNT(*) AS total
      FROM Empleado e
      ${whereSql}
    `);

    const total = totalResult.recordset[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    dataReq.input("limit", sql.Int, limit);
    dataReq.input("offset", sql.Int, offset);

    const dataResult = await dataReq.query(`
      SELECT 
        e.id_empleado,
        e.nombre,
        e.DNI,
        e.correo,
        e.telefono,
        e.direccion,
        e.fecha_ingreso,
        e.fecha_salida,
        est.descripcion AS estado,
        c.nombre_clinica AS clinica,
        r.descripcion AS rol,
        a.nombre_area AS nombre_area,
        e.puesto
      FROM Empleado e
      LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
      LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
      LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
      LEFT JOIN Area a ON e.id_area = a.id_area  
      ${whereSql}
      ORDER BY e.id_empleado
      OFFSET @offset ROWS 
      FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    err.message = err.message || "Error al obtener empleados";
    next(err);
  }
});


// CREAR empleado (POST /)


router.post("/", async (req, res, next) => {
  try {
    const {
      nombre, DNI, correo, fecha_ingreso,
      telefono, direccion, id_estado, id_clinica, id_rol,
      id_area, puesto, foto, usuario_email,
    } = req.body;

    if (!nombre || !DNI || !correo || !id_estado || !id_clinica || !usuario_email) {
      const err = new Error("Faltan campos obligatorios");
      err.status = 400;
      throw err;
    }

    if (id_estado && isNaN(Number(id_estado))) {
      const err = new Error("El campo 'id_estado' debe ser numérico");
      err.status = 400;
      throw err;
    }
    if (id_clinica && isNaN(Number(id_clinica))) {
      const err = new Error("El campo 'id_clinica' debe ser numérico");
      err.status = 400;
      throw err;
    }
    if (id_rol && isNaN(Number(id_rol))) {
      const err = new Error("El campo 'id_rol' debe ser numérico");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();
    pool.config.requestTimeout = 30000;

    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) {
      const err = new Error(auth.error || "No autorizado");
      err.status = 403;
      throw err;
    }
    const usuarioActual = auth.usuario;

    let fotoBuffer = null;

    if (typeof foto === "string" && foto.trim() !== "") {
      try {
        fotoBuffer = Buffer.from(foto, "base64");
      } catch {
        const err = new Error("El campo 'foto' no es base64 válido.");
        err.status = 400;
        throw err;
      }
    }



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
      const err = new Error("El DNI ya existe actualmente.");
      err.status = 409;
      throw err;
    }

    if (existeCorreo > 0) {
      const err = new Error("El correo ya existe actualmente.");
      err.status = 409;
      throw err;
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
      .input("id_area", sql.Int, isNaN(id_area) ? null : id_area)
      .input("puesto", sql.VarChar, puesto ?? "")
      .input("foto", sql.VarBinary(sql.MAX), fotoBuffer)
      .input("fecha_ingreso", sql.Date, fecha_ingreso ? new Date(fecha_ingreso) : null)
      .query(`
        INSERT INTO Empleado (nombre, DNI, correo, telefono, direccion, id_estado, id_clinica, id_rol, id_area, puesto, fecha_ingreso, foto)
        VALUES (@nombre, @DNI, @correo, @telefono, @direccion, @id_estado, @id_clinica, @id_rol, @id_area, @puesto, ISNULL(@fecha_ingreso, GETDATE()), @foto);
        SELECT SCOPE_IDENTITY() AS id_empleado;
      `);

    const nuevoEmpleadoId =
      insertResult.recordset?.[0]?.id_empleado != null
        ? Number(insertResult.recordset[0].id_empleado)
        : null;

    if (usuarioActual && usuarioActual.id_empleado) {
      await pool
        .request()
        .input("id_empleado", sql.Int, usuarioActual.id_empleado)
        .input("accion", sql.VarChar, "Agregado")
        .input("usuario", sql.VarChar, usuarioActual.nombre)
        .input(
          "detalles",
          sql.NVarChar,
          `El usuario ${usuarioActual.nombre} ha agregado al empleado ${nombre}`
        )
        .query(`
          INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
          VALUES (@id_empleado, @accion, GETDATE(), @usuario, @detalles)
        `);
    }

    res.json({
      success: true,
      message: "Empleado agregado correctamente",
      id_empleado: nuevoEmpleadoId,
    });
  } catch (err) {
    err.message = err.message || "Error al agregar empleado";
    err.context = "POST /empleados";
    next(err);
  }
});



// ACTUALIZAR empleado (PUT /:id)
router.put("/:id", async (req, res, next) => {
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
      id_area,
      puesto,
      foto,
      usuario_email,
    } = req.body;

    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      const err = new Error("Parámetro 'id' inválido. Debe ser un entero positivo.");
      err.status = 400;
      throw err;
    }

    if (!usuario_email) {
      const err = new Error("Falta 'usuario_email'.");
      err.status = 400;
      throw err;
    }

    if (id_estado !== undefined && isNaN(Number(id_estado))) {
      const err = new Error("El campo 'id_estado' debe ser numérico.");
      err.status = 400;
      throw err;
    }
    if (id_clinica !== undefined && isNaN(Number(id_clinica))) {
      const err = new Error("El campo 'id_clinica' debe ser numérico.");
      err.status = 400;
      throw err;
    }
    if (id_rol !== undefined && isNaN(Number(id_rol))) {
      const err = new Error("El campo 'id_rol' debe ser numérico.");
      err.status = 400;
      throw err;
    }
    if (
      id_area !== undefined &&
      id_area !== null &&
      id_area !== "" &&
      isNaN(Number(id_area))
    ) {
      const err = new Error("El campo 'id_area' debe ser numérico.");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();

    pool.config.requestTimeout = 30000;
    pool.config.connectionTimeout = 30000;
    pool.config.cancelTimeout = 30000;

    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) {
      const err = new Error(auth.error || "No autorizado");
      err.status = 403;
      throw err;
    }

    const usuarioActual = auth.usuario;

    const prev = await pool
      .request()
      .input("id", sql.Int, idNum)
      .query(`
        SELECT 
          e.id_empleado,
          e.nombre,
          e.id_estado,
          est.descripcion AS estado,
          c.nombre_clinica AS clinica,
          r.descripcion AS rol,
          a.id_area,
          a.nombre_area AS area,
          e.puesto
        FROM Empleado e
        LEFT JOIN Estado_empleado est ON e.id_estado = est.id_estado
        LEFT JOIN Clinica c ON e.id_clinica = c.id_clinica
        LEFT JOIN Rol_empleado r ON e.id_rol = r.id_rol
        LEFT JOIN Area a ON e.id_area = a.id_area
        WHERE e.id_empleado = @id
      `);

    if (!prev.recordset.length) {
      const err = new Error("Empleado no encontrado");
      err.status = 404;
      throw err;
    }

    const anterior = prev.recordset[0];
    const updates = [];
    const request = pool.request().input("id", sql.Int, idNum);

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
      request.input("fecha_ingreso", sql.Date, fecha_ingreso ? new Date(fecha_ingreso) : null);
    }

    if (telefono !== undefined) {
      updates.push("telefono = @telefono");
      request.input("telefono", sql.VarChar, telefono);
    }

    if (direccion !== undefined) {
      updates.push("direccion = @direccion");
      request.input("direccion", sql.VarChar, direccion);
    }

    const ESTADOS_CON_SALIDA = [2, 3];
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
    
    
  if (id_area !== undefined) {
    if (id_area === "" || id_area === null) {
    } else {
      updates.push("id_area = @id_area");
      request.input("id_area", sql.Int, Number(id_area));
    }
  }


    if (puesto !== undefined) {
      updates.push("puesto = @puesto");
      request.input("puesto", sql.VarChar, puesto);
    }

    
    if (typeof foto === "string" && foto.trim() !== "") {
      try {
        const fotoBuffer = Buffer.from(foto, "base64");
        updates.push("foto = @foto");
        request.input("foto", sql.VarBinary(sql.MAX), fotoBuffer);
      } catch {
        const err = new Error("La foto enviada no es base64 válida.");
        err.status = 400;
        throw err;
      }
    }


    if (!updates.length) {
      const err = new Error("No hay campos para actualizar");
      err.status = 400;
      throw err;
    }

    const updateQuery = `
      UPDATE Empleado
      SET ${updates.join(", ")}
      WHERE id_empleado = @id
    `;

    await request.query(updateQuery);

    // Registrar acción
    if (usuarioActual && usuarioActual.id_empleado) {
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
          VALUES (@id_empleado, @accion, SYSUTCDATETIME(), @usuario, @detalles)
        `);
    }

    res.json({ success: true, message: "Empleado actualizado correctamente" });
  } catch (err) {
    err.message = err.message || "Error al actualizar empleado";
    err.context = "PUT /empleados/:id";
    next(err);
  }
});


// ELIMINAR empleado (DELETE /:id)


router.delete("/:id", async (req, res, next) => {
  let transaction;

  try {
    const { id } = req.params;
    const usuario_email =
      req.body?.usuario_email ||
      req.query?.usuario_email ||
      req.headers["x-usuario-email"] ||
      "";

    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      const err = new Error("Parámetro 'id' inválido.");
      err.status = 400;
      throw err;
    }

    if (!usuario_email) {
      const err = new Error("Falta usuario_email.");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();
    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) {
      const err = new Error(auth.error || "No autorizado.");
      err.status = 403;
      throw err;
    }
    const empleadoRes = await pool
      .request()
      .input("id", sql.Int, idNum)
      .query("SELECT nombre FROM Empleado WHERE id_empleado = @id");

    if (!empleadoRes.recordset.length) {
      const err = new Error("Empleado no encontrado");
      err.status = 404;
      throw err;
    }

    const empleado = empleadoRes.recordset[0];

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    await new sql.Request(transaction)
      .input("id", sql.Int, idNum)
      .query("DELETE FROM Historial_clinica WHERE id_empleado = @id");

    await new sql.Request(transaction)
      .input("id", sql.Int, idNum)
      .query("DELETE FROM CuentaSSO WHERE id_empleado = @id");

    await new sql.Request(transaction)
      .input("id", sql.Int, idNum)
      .query("DELETE FROM Empleado WHERE id_empleado = @id");

    // Registrar acción
    const detalles = `El usuario ${auth.usuario.nombre} ha eliminado al empleado ${empleado.nombre}`;
    await new sql.Request(transaction)
      .input("id_empleado", sql.Int, auth.usuario.id_empleado)
      .input("accion", sql.VarChar, "Eliminado")
      .input("usuario", sql.VarChar, auth.usuario.nombre)
      .input("detalles", sql.NVarChar, detalles)
      .query(`
        INSERT INTO RRHH_RegistroAcciones 
        (id_empleado, accion, fecha, usuario, detalles)
        VALUES (@id_empleado, @accion, SYSUTCDATETIME(), @usuario, @detalles)
      `);

    await transaction.commit();
    res.json({ success: true, message: "Empleado eliminado correctamente" });

  } catch (err) {
    if (transaction && transaction.state === "begun") {
      try { await transaction.rollback(); } catch {}
    }
    err.message = err.message || "Error al eliminar empleado";
    err.context = "DELETE /empleados/:id";
    next(err);
  }
});


// IMPORTAR empleados desde Excel (POST /importar)

const normalizarDNI = (dni) => (dni ? dni.replace(/[\s-]/g, "") : "");

const parseExcelDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) {
    return value;
  }
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  if (typeof value === "string") {
    const iso = value.match(/^\d{4}-\d{2}-\d{2}$/);
    if (iso) return new Date(value);
  }
  return null;
};


router.post("/importar", upload.single("archivo"), async (req, res, next) => {
  const { usuario_email } = req.body;
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      const err = new Error("No se subió ningún archivo");
      err.status = 400;
      throw err;
    }
    if (!usuario_email) {
      const err = new Error("Falta usuario_email");
      err.status = 400;
      throw err;
    }

    const pool = await connectDB();
    pool.config.requestTimeout = 60000;

    const auth = await verificarRoles(pool, usuario_email, [PERMS.ADMIN, PERMS.RRHH]);
    if (!auth.ok) {
      const err = new Error(auth.error || "No autorizado");
      err.status = 403;
      throw err;
    }
    const usuarioActual = auth.usuario;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      const err = new Error("El archivo Excel no contiene una hoja válida");
      err.status = 400;
      throw err;
    }

    const empleadosAgregados = [];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const nombre = cellToString(row.getCell(1).value);
      const DNIraw = cellToString(row.getCell(2).value);
      const DNI = normalizarDNI(DNIraw);
      const correo = cellToString(row.getCell(3).value);

      const fechaIngCell = row.getCell(4).value;
      const fechaSalCell = row.getCell(5).value;

      const telefono = cellToString(row.getCell(6).value || "");
      const direccion = cellToString(row.getCell(7).value || "");

      const id_estado = Number(cellToString(row.getCell(8).value || "1"));
      const id_clinica = Number(cellToString(row.getCell(9).value || "1"));
      const id_rol    = Number(cellToString(row.getCell(10).value || "3"));   
      const id_area = Number(cellToString(row.getCell(11).value || ""));
      const puesto  = cellToString(row.getCell(12).value || "");
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

      const fecha_ingreso = parseExcelDate(fechaIngCell);
      const fecha_salida  = parseExcelDate(fechaSalCell);
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
        .input("id_area", sql.Int, isNaN(id_area) ? null : id_area)
        .input("puesto", sql.VarChar, puesto)
        .query(`
          
          INSERT INTO Empleado (
            nombre, DNI, correo, telefono, direccion,
            id_estado, id_clinica, id_rol,
            id_area, puesto,
            fecha_ingreso, fecha_salida, foto
          )
          VALUES (
            @nombre, @DNI, @correo, @telefono, @direccion,
            @id_estado, @id_clinica, @id_rol,
            @id_area, @puesto,
            ISNULL(@fecha_ingreso, GETDATE()), @fecha_salida, @foto
          );
          SELECT SCOPE_IDENTITY() AS id_empleado;
        `);

      const nuevoEmpleadoId =
        insertResult.recordset?.[0]?.id_empleado != null
          ? Number(insertResult.recordset[0].id_empleado)
          : null;

      empleadosAgregados.push({ id_empleado: nuevoEmpleadoId, nombre });

      // Registrar acción por cada importado
      await pool
        .request()
        .input("id_empleado", sql.Int, usuarioActual.id_empleado)
        .input("accion", sql.VarChar, "Importado")
        .input("usuario", sql.VarChar, usuarioActual.nombre)
        .input(
          "detalles",
          sql.NVarChar,
          `El usuario ${usuarioActual.nombre} ha importado al empleado ${nombre}`
        )
        .query(`
          INSERT INTO RRHH_RegistroAcciones (id_empleado, accion, fecha, usuario, detalles)
          VALUES (@id_empleado, @accion, SYSUTCDATETIME(), @usuario, @detalles)
        `);
    }

    res.json({
      success: true,
      message: "Archivo importado correctamente",
      empleados: empleadosAgregados,
    });
  } catch (err) {
    err.message = err.message || "Error al importar Excel";
    err.context = "POST /empleados/importar";
    next(err);
  } finally {
    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
      }
    }
  }
});

export default router;
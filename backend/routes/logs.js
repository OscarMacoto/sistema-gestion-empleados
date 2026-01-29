import express from "express";
import { connectDB, sql } from "../db.js";
import ExcelJS from "exceljs";

const router = express.Router();

const isYYYYMMDD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const parseDesde = (fechaStr) => {
  if (!fechaStr) return null;
  if (!isYYYYMMDD(fechaStr)) return null; 
  return new Date(`${fechaStr}T00:00:00`);
};

const parseHasta = (fechaStr) => {
  if (!fechaStr) return null;
  if (!isYYYYMMDD(fechaStr)) return null;
  const fecha = new Date(`${fechaStr}T00:00:00`);
  fecha.setDate(fecha.getDate() + 1);
  return fecha;
};

const toDisplayDateTime = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
};

router.get("/", async (req, res, next) => {
  try {
    let { desde, hasta, page = 1, limit = 100 } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({ error: "Parámetro 'page' inválido. Debe ser un entero >= 1." });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 5000) {
      return res.status(400).json({ error: "Parámetro 'limit' inválido. Debe estar entre 1 y 5000." });
    }

    if (desde && !isYYYYMMDD(desde)) {
      return res.status(400).json({ error: "Parámetro 'desde' inválido. Formato esperado: YYYY-MM-DD." });
    }
    if (hasta && !isYYYYMMDD(hasta)) {
      return res.status(400).json({ error: "Parámetro 'hasta' inválido. Formato esperado: YYYY-MM-DD." });
    }

    const pool = await connectDB();
    let where = "WHERE 1=1";
    const totalReq = pool.request();
    const dataReq = pool.request();

    if (desde) {
      totalReq.input("desde", sql.DateTime2, parseDesde(desde));
      dataReq.input("desde", sql.DateTime2, parseDesde(desde));
      where += " AND fecha >= @desde";
    }
    if (hasta) {
      totalReq.input("hasta", sql.DateTime2, parseHasta(hasta));
      dataReq.input("hasta", sql.DateTime2, parseHasta(hasta));
      where += " AND fecha < @hasta"; // exclusivo (día siguiente)
    }

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM RRHH_RegistroAcciones
      ${where}
    `;
    const totalRes = await totalReq.query(totalSql);
    const total = totalRes.recordset[0]?.total ?? 0;

    const offset = (page - 1) * limit;
    dataReq.input("limit", sql.Int, limit);
    dataReq.input("offset", sql.Int, offset);

    const dataSql = `
      SELECT id_registro, id_empleado, accion, fecha, usuario, detalles
      FROM RRHH_RegistroAcciones
      ${where}
      ORDER BY fecha DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const result = await dataReq.query(dataSql);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    err.context = "GET /logs";
    next(err);
  }
});

router.get("/exportar", async (req, res, next) => {
  try {
    const { desde, hasta } = req.query;

    if (desde && !isYYYYMMDD(desde)) {
      return res.status(400).json({ error: "Parámetro 'desde' inválido. Formato esperado: YYYY-MM-DD." });
    }
    if (hasta && !isYYYYMMDD(hasta)) {
      return res.status(400).json({ error: "Parámetro 'hasta' inválido. Formato esperado: YYYY-MM-DD." });
    }

    const pool = await connectDB();
    let where = "WHERE 1=1";
    const request = pool.request();

    if (desde) {
      request.input("desde", sql.DateTime2, parseDesde(desde));
      where += " AND fecha >= @desde";
    }
    if (hasta) {
      request.input("hasta", sql.DateTime2, parseHasta(hasta));
      where += " AND fecha < @hasta";
    }

    const query = `
      SELECT id_registro, id_empleado, accion, fecha, usuario, detalles
      FROM RRHH_RegistroAcciones
      ${where}
      ORDER BY fecha DESC
    `;
    const result = await request.query(query);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Logs");

    sheet.columns = [
      { header: "ID Registro", key: "id_registro", width: 12 },
      { header: "ID Empleado", key: "id_empleado", width: 12 },
      { header: "Acción", key: "accion", width: 24 },
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Usuario", key: "usuario", width: 24 },
      { header: "Detalles", key: "detalles", width: 60 },
    ];

    result.recordset.forEach((row) => {
      sheet.addRow({
        ...row,
        fecha: toDisplayDateTime(row.fecha),
      });
    });

    const rango = [
      desde ? `desde-${desde}` : null,
      hasta ? `hasta-${hasta}` : null,
    ].filter(Boolean).join("_");
    const ts = new Date();
    const y = ts.getFullYear();
    const mm = String(ts.getMonth() + 1).padStart(2, "0");
    const dd = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const mi = String(ts.getMinutes()).padStart(2, "0");
    const filename = `logs_${rango || "completo"}_${y}-${mm}-${dd}_${hh}${mi}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    err.context = "GET /logs/exportar";
    next(err);
  }
});

export default router;
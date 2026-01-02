import express from "express";
import { connectDB, sql } from "../db.js";
import ExcelJS from "exceljs";

const router = express.Router();

const parseDesde = (fechaStr) => {
  if (!fechaStr) return null;
  return new Date(`${fechaStr}T00:00:00`);
};


const parseHasta = (fechaStr) => {
  if (!fechaStr) return null;
  const fecha = new Date(`${fechaStr}T00:00:00`);
  fecha.setDate(fecha.getDate() + 1);
  return fecha;
};

// GET /logs

router.get("/", async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    const pool = await connectDB();
    let query = `
      SELECT id_registro, id_empleado, accion, fecha, usuario, detalles
      FROM RRHH_RegistroAcciones
      WHERE 1 = 1
    `;
    const request = pool.request();

    if (desde) {
      request.input("desde", sql.DateTime2, parseDesde(desde));
      query += " AND fecha >= @desde";
    }

    if (hasta) {
      request.input("hasta", sql.DateTime2, parseHasta(hasta));
      query += " AND fecha < @hasta";
    }

    query += " ORDER BY fecha DESC";

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener registros:", error);
    res.status(500).json({ error: "Error al obtener registros" });
  }
});

// GET /logs/exportar

router.get("/exportar", async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    const pool = await connectDB();
    let query = `
      SELECT id_registro, id_empleado, accion, fecha, usuario, detalles
      FROM RRHH_RegistroAcciones
      WHERE 1 = 1
    `;
    const request = pool.request();

    if (desde) {
      request.input("desde", sql.DateTime2, parseDesde(desde));
      query += " AND fecha >= @desde";
    }

    if (hasta) {
      request.input("hasta", sql.DateTime2, parseHasta(hasta));
      query += " AND fecha < @hasta";
    }

    query += " ORDER BY fecha DESC";

    const result = await request.query(query);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Logs");

    sheet.columns = [
      { header: "ID Registro", key: "id_registro", width: 15 },
      { header: "ID Empleado", key: "id_empleado", width: 15 },
      { header: "Acción", key: "accion", width: 25 },
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Usuario", key: "usuario", width: 25 },
      { header: "Detalles", key: "detalles", width: 50 },
    ];

    result.recordset.forEach(row => sheet.addRow(row));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=logs.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar registros:", error);
    res.status(500).json({ error: "Error al exportar registros" });
  }
});

export default router;

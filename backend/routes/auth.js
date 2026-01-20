import express from "express";
import sql from "mssql";
import { connectDB } from "../db.js";

const router = express.Router();

router.post("/actualizar-login", async (req, res) => {
  const { id_empleado } = req.body;

  if (!id_empleado) {
    return res.status(400).json({ error: "Falta el id_empleado" });
  }

  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("id_empleado", sql.Int, Number(id_empleado))
      .query(`
        UPDATE CuentaSSO
        SET L_login = GETDATE()
        WHERE id_empleado = @id_empleado
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Empleado no encontrado o sin cuenta SSO",
      });
    }

    return res.status(200).json({
      success: true,
      message: "L_login actualizado correctamente",
    });

  } catch (err) {
    console.error("POST /actualizar-login error:", err);

    return res.status(500).json({
      error: "Error interno al actualizar el login",
    });
  }
});

export default router;

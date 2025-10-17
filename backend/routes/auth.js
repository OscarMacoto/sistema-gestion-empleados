import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

router.post("/actualizar-login", async (req, res) => {
  const { id_empleado } = req.body;

  if (!id_empleado) {
    return res.status(400).json({ error: "Falta el id_empleado" });
  }

  try {
    const pool = await connectDB();

    await pool
      .request()
      .input("id_empleado", id_empleado)
      .query(`
        UPDATE CuentaSSO
        SET L_login = GETDATE()
        WHERE id_empleado = @id_empleado
      `);

    res.json({ message: "L_login actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar L_login:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
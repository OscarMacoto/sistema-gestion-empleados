import express from "express";
import { connectDB } from "../db.js";

const router = express.Router();

// Listar todos los roles
router.get("/", async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query("SELECT * FROM Rol_empleado");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener roles:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

// Obtener roles de un empleado específico
router.get("/empleado/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input("id_empleado", id)
      .query(`
        SELECT r.id_rol, r.nombre_rol
        FROM Rol_empleado r
        INNER JOIN Empleado_Rol er ON r.id_rol = er.id_rol
        WHERE er.id_empleado = @id_empleado
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener roles del empleado:", err);
    res.status(500).json({ error: "Error al obtener roles del empleado" });
  }
});

// Asignar roles a un empleado
router.post("/empleado/:id", async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;
  if (!Array.isArray(roles)) return res.status(400).json({ error: "roles debe ser un array de ids" });

  try {
    const pool = await connectDB();
    await pool.request().input("id_empleado", id).query("DELETE FROM Empleado_Rol WHERE id_empleado = @id_empleado");

    for (let id_rol of roles) {
      await pool.request()
        .input("id_empleado", id)
        .input("id_rol", id_rol)
        .query("INSERT INTO Empleado_Rol (id_empleado, id_rol) VALUES (@id_empleado, @id_rol)");
    }

    res.json({ success: true, message: "Roles actualizados correctamente" });
  } catch (err) {
    console.error("Error al asignar roles:", err);
    res.status(500).json({ error: "Error al asignar roles" });
  }
});

export default router;

import express from "express";
import cors from "cors";
import  sql  from "mssql";
import  {connectDB}  from "./db.js";
import empleadosRoutes from "./routes/empleados.js";
import clinicasRoutes from "./routes/clinicas.js";
import estadosRoutes from "./routes/estados.js";
import ssoRoutes from "./routes/sso.js";

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));

app.use(express.json());

app.use("/api/empleados", empleadosRoutes);
app.use("/api/clinicas", clinicasRoutes);
app.use("/api/estados", estadosRoutes);
app.use("/api/sso", ssoRoutes);

const PORT = 5000;
app.get("/api/empleados/:correo", async (req, res) => {
  try {
    const correo = req.params.correo;
    console.log("📩 Buscando empleado con correo:", correo);
    const pool = await connectDB();
    const result = await pool.request()

      .input("correo", sql.VarChar, correo)
      .query(`
        SELECT  
          e.id_empleado, 
          e.nombre, 
          e.DNI, 
          e.correo, 
          e.fecha_ingreso, 
          e.telefono, 
          c.nombre_clinica AS clinica, 
          est.descripcion AS estado 
        FROM Empleado e 
        INNER JOIN Clinica c ON e.id_clinica = c.id_clinica 
        INNER JOIN Estado_empleado est ON e.id_estado = est.id_estado 
        WHERE e.correo = @correo
      `);

    console.log("Resultado de la consulta:", result.recordset); 
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    res.json(result.recordset[0]);

  } catch (err) {
    console.error("Error al obtener datos del empleado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

import express from "express"; 
import { connectDB } from "../db.js"; 
 
const router = express.Router();   
router.get("/", async (req, res) => { 
  try { 
    const pool = await connectDB(); 
    const result = await pool.request().query(` 
      SELECT id_estado, descripcion AS estado 
      FROM Estado_empleado 
    `); 
    res.json(result.recordset); 
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ error: err.message }); 
  } 
}); 
export default router; 
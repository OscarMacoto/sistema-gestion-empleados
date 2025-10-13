import { connectDB, sql } from "./db.js"; 

  

async function test() { 

  try { 

    const pool = await connectDB(); 

    const result = await sql.query("SELECT * FROM Empleado"); 

    console.log(result.recordset); 

    process.exit(); 

  } catch (err) { 

    console.error(err); 

  } 

} 


test(); 
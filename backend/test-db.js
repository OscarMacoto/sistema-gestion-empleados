import sql from "mssql/msnodesqlv8.js";

const dbConfig = {
  server: "localhost",
  database: "RRHH",
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
};

async function testConnection() {
  try {
    console.log("Conectando a SQL Server...");
    const pool = await sql.connect(dbConfig);

    console.log("✔ Conectado correctamente.");
    const result = await pool.request().query("SELECT 1 AS resultado");
    console.log(result.recordset);

    await pool.close();
  } catch (err) {
    console.error("❌ Error detalle:", JSON.stringify(err, null, 2));
  }
}

testConnection();

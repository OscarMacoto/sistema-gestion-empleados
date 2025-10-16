import sql from "mssql";

const dbConfig = {
  user: "appuser",
  password: "12345",
  server: "OSCAR-MACOTO-HN01",
  database: "RRHH",
  options: {
    encrypt: true, 
    trustServerCertificate: true,
  },
};

 async function connectDB() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Conectado a la base de datos");
    return pool;
  } catch (error) {
    console.error("Error de conexión:", error);
    throw error;
  }
}

export { connectDB, sql };
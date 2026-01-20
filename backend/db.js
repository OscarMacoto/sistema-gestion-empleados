import sql from "mssql";

const dbConfig = {
  user: "appuser",
  password: "12345",
  server: "localhost",
  port: 1433,
  database: "RRHH",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 60000,
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
};

let pool = null;

export async function connectDB() {
  try {
    if (pool) {
      if (!pool.connected) {
        console.warn("Pool desconectado, reconectando...");
        await pool.connect();
      }
      return pool;
    }

    pool = new sql.ConnectionPool(dbConfig);

    pool.on("error", (err) => {
      console.error("💥 Error en el pool SQL:", err);
      pool = null;
    });

    await pool.connect();
    console.log("Pool SQL conectado correctamente");

    return pool;
  } catch (error) {
    console.error("Error conectando a SQL Server:", error);
    pool = null;
    const err = new Error("No se pudo conectar a la base de datos");
    err.status = 500;
    err.originalError = error;

    throw err;
  }
}

export { sql };
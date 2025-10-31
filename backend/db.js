import sql from "mssql";

const dbConfig = {
  user: "appuser",
  password: "12345",
  server: "OSCAR-MACOTO-HN01",
  database: "RRHH",
  options: {
    encrypt: false, 
    trustServerCertificate: true,
  },
  pool: {
    max: 10,              
    min: 0,               
    idleTimeoutMillis: 30000, 
  },
  requestTimeout: 30000,  
};

let poolGlobal = null;

export async function connectDB() {
  try {
    if (poolGlobal) {
      if (poolGlobal.connected) return poolGlobal;

      await poolGlobal.connect();
      return poolGlobal;
    }

    poolGlobal = new sql.ConnectionPool(dbConfig);

    poolGlobal.on("error", (err) => {
      console.error("⚠️ Error en el pool SQL:", err);
      poolGlobal = null; 
    });

    await poolGlobal.connect();
    console.log("Conectado a la base de datos (pool inicializado)");
    return poolGlobal;
  } catch (error) {
    console.error("Error de conexión a la base de datos:", error);
    poolGlobal = null;
    throw error;
  }
}

export { sql };

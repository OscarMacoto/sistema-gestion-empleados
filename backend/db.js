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

let poolGlobal = null;

async function connectDB() {
  try {
    if (poolGlobal) {
      if (poolGlobal.connected) return poolGlobal;
      await poolGlobal.connect();
      return poolGlobal;
    }

    poolGlobal = await sql.connect(dbConfig);
    console.log("✅ Conectado a la base de datos (pool inicializado)");
    return poolGlobal;
  } catch (error) {
    console.error("❌ Error de conexión a la base de datos:", error);
    poolGlobal = null; 
    throw error;
  }
}

export { connectDB, sql };

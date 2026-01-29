import sql from "mssql";

const dbConfig = {
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "12345",
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "RRHH",
  options: {
    encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === "true" : false,
    trustServerCertificate:
      process.env.DB_TRUST_CERT ? process.env.DB_TRUST_CERT === "true" : true,
    enableArithAbort: true,
  },
  pool: {
    max: Number(process.env.DB_POOL_MAX || 20),
    min: Number(process.env.DB_POOL_MIN || 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 60000),
  },
  connectionTimeout: Number(process.env.DB_CONN_TIMEOUT || 30000),
  requestTimeout: Number(process.env.DB_REQ_TIMEOUT || 60000),
};

let pool = null;
let connectingPromise = null;

/**
 * @param {number} retries
 * @param {number} baseDelayMs
 */
async function connectWithRetry(retries = 3, baseDelayMs = 500) {
  let attempt = 0;
  while (true) {
    try {
      const _pool = new sql.ConnectionPool(dbConfig);
      _pool.on("error", (err) => {
        console.error("[DB] Error en el pool SQL:", {
          message: err?.message,
          code: err?.code,
          number: err?.number,
        });
        pool = null;
      });

      await _pool.connect();
      console.log("[DB] Pool SQL conectado correctamente");
      return _pool;
    } catch (error) {
      attempt++;
      const isLast = attempt > retries;

      console.error("[DB] Error conectando a SQL Server:", {
        attempt,
        retries,
        message: error?.message,
        code: error?.code,
        number: error?.number,
      });

      if (isLast) {
        const err = new Error("No se pudo conectar a la base de datos");
        err.status = 500;
        err.originalError = error;
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function connectDB() {
  try {
    if (pool && pool.connected) {
      return pool;
    }

    if (connectingPromise) {
      return await connectingPromise;
    }

    connectingPromise = connectWithRetry(
      Number(process.env.DB_CONN_RETRIES || 3),
      Number(process.env.DB_CONN_BASE_DELAY || 500)
    );

    pool = await connectingPromise;
    connectingPromise = null;
    return pool;
  } catch (error) {
    connectingPromise = null;
    const err = new Error("No se pudo establecer conexión con la base de datos");
    err.status = 500;
    err.originalError = error;
    throw err;
  }
}

export async function getRequest({ timeoutMs } = {}) {
  const p = await connectDB();
  const request = p.request();
  if (timeoutMs && Number.isInteger(timeoutMs)) {
    request.timeout = timeoutMs;
  }
  return request;
}

export async function pingDB() {
  const p = await connectDB();
  const result = await p.request().query("SELECT 1 AS ok");
  return result?.recordset?.[0]?.ok === 1;
}

export async function closeDB() {
  if (pool) {
    try {
      await pool.close();
      console.log("[DB] Pool cerrado correctamente");
    } catch (e) {
      console.warn("[DB] Error cerrando pool:", e?.message || e);
    } finally {
      pool = null;
    }
  }
}

export { sql };
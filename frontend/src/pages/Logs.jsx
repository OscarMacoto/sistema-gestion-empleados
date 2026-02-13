import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validarFechas = () => {
    if (!desde || !hasta) {
      setError("Por favor selecciona ambas fechas");
      return false;
    }
    if (desde > hasta) {
      setError("La fecha 'Desde' no puede ser mayor que 'Hasta'");
      return false;
    }
    return true;
  };

  const obtenerLogs = async (opts = {}) => {
    const _page = opts.page ?? page;
    const _limit = opts.limit ?? limit;

    if (!validarFechas()) return;

    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/logs", {
        params: {
          desde,
          hasta,
          page: _page,
          limit: _limit,
        },
      });

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setLogs(rows);
      setPagination(Array.isArray(data) ? null : data?.pagination ?? null);

      if (data?.pagination) {
        setPage(data.pagination.page);
        setLimit(data.pagination.limit);
      } else {
        setPage(_page);
        setLimit(_limit);
      }
    } catch (err) {
      console.error("Error al obtener logs:", err);
      setError(
        err?.response?.data?.error ?? err?.message ?? "Error al obtener logs"
      );
      setLogs([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const exportarLogs = () => {
    if (!validarFechas()) return;
    const url = new URL(`${API_BASE}/logs/exportar`);
    url.searchParams.set("desde", desde);
    url.searchParams.set("hasta", hasta);

    window.open(url.toString(), "_blank");
  };

  const formatFecha = (v) => {
    if (!v) return "";
    try {
      const d = typeof v === "string" ? new Date(v) : v;
      if (Number.isNaN(d.getTime())) {
        return String(v).replace("T", " ").slice(0, 19);
      }
      return d.toLocaleString();
    } catch {
      return String(v).replace("T", " ").slice(0, 19);
    }
  };

  const rows = Array.isArray(logs) ? logs : [];

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4 font-semibold">Registros de Logs</h1>

      <div className="mb-4 flex gap-2 items-end flex-wrap">
        <label className="flex flex-col text-sm">
          Desde:
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>

        <label className="flex flex-col text-sm">
          Hasta:
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setPage(1);
            obtenerLogs({ page: 1, limit });
          }}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-blue-700 hover:text-white transition"
        >
          Filtrar
        </button>

        <button
          type="button"
          onClick={exportarLogs}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Exportar Excel
        </button>

        {pagination && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (page > 1) {
                  const next = page - 1;
                  setPage(next);
                  obtenerLogs({ page: next, limit });
                }
              }}
              disabled={page <= 1}
              className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              ⬅️
            </button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                if (pagination && page < pagination.totalPages) {
                  const next = page + 1;
                  setPage(next);
                  obtenerLogs({ page: next, limit });
                }
              }}
              disabled={!pagination || page >= pagination.totalPages}
              className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              ➡️
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="table-auto border-collapse border border-gray-300 w-full text-left text-sm">
            <thead className="bg-gray-300 text-black">
              <tr>
                <th className="px-3 py-2">ID Registro</th>
                <th className="px-3 py-2">ID Empleado</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">
                    No hay registros
                  </td>
                </tr>
              ) : (
                rows.map((log, index) => (
                  <tr
                    key={log.id_registro ?? `${index}-${log.fecha}`}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="border px-3 py-2">{log.id_registro}</td>
                    <td className="border px-3 py-2">{log.id_empleado}</td>
                    <td className="border px-3 py-2">{log.accion}</td>
                    <td className="border px-3 py-2">
                      {formatFecha(log.fecha)}
                    </td>
                    <td className="border px-3 py-2">{log.usuario}</td>
                    <td className="border px-3 py-2">{log.detalles}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Logs;
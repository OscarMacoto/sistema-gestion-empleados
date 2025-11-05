import React, { useState } from "react";
import axios from "axios";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const obtenerLogs = async () => {
    if (!desde || !hasta) {
      setError("Por favor selecciona ambas fechas");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("http://localhost:5000/api/logs", {
        params: { desde, hasta },
      });
      setLogs(data);
    } catch (err) {
      console.error("Error al obtener logs:", err);
      setError("Error al obtener logs");
    }
    setLoading(false);
  };

  const exportarLogs = () => {
    if (!desde || !hasta) {
      setError("Por favor selecciona ambas fechas");
      return;
    }
    window.open(
      `http://localhost:5000/api/logs/exportar?desde=${desde}&hasta=${hasta}`,
      "_blank"
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4 font-semibold">Registros de Logs</h1>

      <div className="mb-4 flex gap-2 items-center">
        <label>
          Desde:
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border px-2 py-1 ml-1 rounded"
          />
        </label>

        <label>
          Hasta:
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border px-2 py-1 ml-1 rounded"
          />
        </label>

        <button
          onClick={obtenerLogs}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition"
        >
          Filtrar
        </button>

        <button
          onClick={exportarLogs}
          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition"
        >
          Exportar Excel
        </button>
      </div>

      {error && <p className="text-red-500 mb-2">{error}</p>}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="table-auto border-collapse border border-gray-300 w-full text-left">
          <thead className="bg-blue-600 text-white">
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
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-2">
                  No hay registros
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr
                  key={log.id_registro}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="border px-3 py-2">{log.id_registro}</td>
                  <td className="border px-3 py-2">{log.id_empleado}</td>
                  <td className="border px-3 py-2">{log.accion}</td>
                  <td className="border px-3 py-2">
                    {new Date(log.fecha).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">{log.usuario}</td>
                  <td className="border px-3 py-2">{log.detalles}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Logs;

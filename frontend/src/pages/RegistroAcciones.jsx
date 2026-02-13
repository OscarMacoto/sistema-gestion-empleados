import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

const RegistroAcciones = () => {
  const [logs, setLogs] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;
  const [cargando, setCargando] = useState(false);

  const validarFechas = () => {
    if (!fechaInicio || !fechaFin) {
      alert("Selecciona ambas fechas");
      return false;
    }
    if (fechaInicio > fechaFin) {
      alert("La fecha inicio no puede ser mayor que la fin");
      return false;
    }
    return true;
    };

  const obtenerLogs = async () => {
    if (!validarFechas()) return;
    setCargando(true);
    try {
      const { data } = await api.get("/logs", {
        params: { desde: fechaInicio, hasta: fechaFin },
      });
      setLogs(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      setPaginaActual(1);
    } catch (error) {
      console.error("Error al obtener registros:", error);
      alert(error?.response?.data?.error || "Error al obtener registros");
    } finally {
      setCargando(false);
    }
  };

  const exportarExcel = async () => {
    if (!validarFechas()) return;

    const url = new URL(`${API_BASE}/logs/exportar`);
    url.searchParams.set("desde", fechaInicio);
    url.searchParams.set("hasta", fechaFin);
    window.open(url.toString(), "_blank");
  };

  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;
  const logsActuales = logs.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(logs.length / registrosPorPagina);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center mb-6">Registro de Acciones</h2>

      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Fecha inicio:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="p-2 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fecha fin:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="p-2 border rounded text-sm"
          />
        </div>
        <button
          type="button"
          onClick={obtenerLogs}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Exportar Excel
        </button>
      </div>

      {cargando && <p className="text-center text-gray-500">Cargando registros...</p>}

      {!cargando && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg text-sm">
            <thead>
              <tr className="bg-blue-200">
                <th className="py-1 px-2 border">ID</th>
                <th className="py-1 px-2 border">Usuario</th>
                <th className="py-1 px-2 border">Acción</th>
                <th className="py-1 px-2 border">Tabla</th>
                <th className="py-1 px-2 border">Fecha</th>
                <th className="py-1 px-2 border">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logsActuales.map((log) => (
                <tr key={log.id_registro} className="text-center border-b">
                  <td className="py-1 px-2">{log.id_registro}</td>
                  <td className="py-1 px-2">{log.usuario}</td>
                  <td className="py-1 px-2">{log.accion}</td>
                  <td className="py-1 px-2">{log.tabla}</td>
                  <td className="py-1 px-2">{new Date(log.fecha).toLocaleString()}</td>
                  <td className="py-1 px-2 text-left">{log.detalles}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center mt-4 gap-2">
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual(paginaActual - 1)}
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-2 py-1">
              {paginaActual} / {totalPaginas || 1}
            </span>
            <button
              type="button"
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
              onClick={() => setPaginaActual(paginaActual + 1)}
              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {!cargando && logs.length === 0 && (
        <p className="text-center text-gray-500 mt-4">
          No hay registros para las fechas seleccionadas.
        </p>
      )}
    </div>
  );
};

export default RegistroAcciones;
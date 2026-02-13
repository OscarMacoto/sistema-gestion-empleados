import { useEffect, useState } from "react";
import { API_BASE } from "../config/api";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} → ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

function Estados() {
  const [estados, setEstados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 6;

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarEstados = async () => {
      try {
        setCargando(true);
        setError("");
        const data = await apiGet("/estados");
        setEstados(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("No se pudieron cargar estados:", e);
        setError("No se pudieron cargar estados.");
      } finally {
        setCargando(false);
      }
    };

    cargarEstados();
  }, []);

  const filtrados = Array.isArray(estados)
    ? estados.filter((e) =>
        e.estado?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAjustada = Math.min(pagina, totalPaginas);
  const inicio = (paginaAjustada - 1) * porPagina;
  const fin = inicio + porPagina;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Estados de Empleado
      </h2>

      <input
        type="text"
        placeholder="Buscar estado..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
        className="border p-2 mb-4 w-full rounded-lg"
      />

      {cargando ? (
        <div className="text-center text-gray-500 min-h-[120px]">
          Cargando estados…
        </div>
      ) : error ? (
        <div className="text-center text-red-600 min-h-[120px]">{error}</div>
      ) : (
        <>
          <table className="min-w-full border border-gray-300 rounded-lg text-center">
            <thead className="bg-gray-300 text-black">
              <tr>
                <th className="py-2 px-4">ID</th>
                <th className="py-2 px-4">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(inicio, fin).map((e) => (
                <tr key={e.id_estado} className="border-b hover:bg-blue-100">
                  <td className="py-2">{e.id_estado}</td>
                  <td className="py-2">{e.estado}</td>
                </tr>
              ))}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="2" className="py-4 text-gray-500">
                    No se encontraron estados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-center items-center mt-4 gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAjustada === 1}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              ⬅️
            </button>

            <span>
              Página {paginaAjustada} de {totalPaginas || 1}
            </span>

            <button
              type="button"
              onClick={() =>
                setPagina((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaAjustada === totalPaginas || totalPaginas === 0}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
            >
              ➡️
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Estados;
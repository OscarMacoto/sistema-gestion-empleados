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

function SSO() {
  const [sso, setSso] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 6;

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarSSO = async () => {
      try {
        setCargando(true);
        setError("");
        const data = await apiGet("/sso");
        setSso(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error al cargar datos SSO:", e);
        setError("No se pudieron cargar los datos de SSO.");
      } finally {
        setCargando(false);
      }
    };

    cargarSSO();
  }, []);

  const filtrados = Array.isArray(sso)
    ? sso.filter((u) =>
        (u?.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAjustada = Math.min(pagina, totalPaginas);
  const inicio = (paginaAjustada - 1) * porPagina;
  const fin = inicio + porPagina;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Cuentas SSO</h2>

      <input
        type="text"
        placeholder="Buscar usuario..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
        className="border p-2 mb-4 w-full rounded-lg"
      />

      {cargando ? (
        <div className="text-center text-gray-500 min-h-[120px]">
          Cargando SSO…
        </div>
      ) : error ? (
        <div className="text-center text-red-600 min-h-[120px]">{error}</div>
      ) : (
        <>
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-300 text-Black text-center">
              <tr>
                <th className="py-2 px-4">ID Empleado</th>
                <th className="py-2 px-4">Nombre</th>
                <th className="py-2 px-4">Login</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {filtrados.slice(inicio, fin).map((u) => (
                <tr key={u.id_empleado} className="border-b hover:bg-blue-100">
                  <td className="py-2">{u.id_empleado}</td>
                  <td className="py-2">{u.nombre}</td>
                  <td className="py-2">
                    {(u?.L_login || "").slice(0, 10)}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 text-gray-500">
                    No se encontraron usuarios.
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
              Página {paginaAjustada} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAjustada === totalPaginas}
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

export default SSO;
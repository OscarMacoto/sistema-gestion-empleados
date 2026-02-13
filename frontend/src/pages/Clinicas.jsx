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

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let payload;
    try {
      payload = await res.json();
    } catch {
      payload = { error: await res.text().catch(() => "Error desconocido") };
    }
    const message = payload?.error || payload?.message || "Error en la solicitud";
    const e = new Error(message);
    e.status = res.status;
    throw e;
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function Clinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const [nuevaClinica, setNuevaClinica] = useState({ nombre_clinica: "" });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarClinicas();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [busqueda]);

  const cargarClinicas = async () => {
    try {
      setCargando(true);
      const data = await apiGet("/clinicas");
      setClinicas(Array.isArray(data) ? data : []);
      setPagina(1);
    } catch (err) {
      console.error("No se pudieron cargar las clínicas:", err);
      alert("No se pudieron cargar las clínicas");
    } finally {
      setCargando(false);
    }
  };

  const handleChangeClinica = (e) => {
    setNuevaClinica({ ...nuevaClinica, [e.target.name]: e.target.value });
  };

  const agregarClinica = async () => {
    try {
      if (!nuevaClinica.nombre_clinica?.trim()) return;
      setGuardando(true);

      await apiPost("/clinicas", nuevaClinica);

      alert("Clínica agregada correctamente");
      setNuevaClinica({ nombre_clinica: "" });
      setMostrarFormulario(false);
      await cargarClinicas();
    } catch (error) {
      console.error(error);
      alert(error.message || "Error al agregar clínica");
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = Array.isArray(clinicas)
    ? clinicas.filter((c) =>
        c.nombre_clinica?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAjustada = Math.min(pagina, totalPaginas);
  const inicio = (paginaAjustada - 1) * porPagina;
  const fin = inicio + porPagina;

  const rolActual = localStorage.getItem("usuario_rol");
  const agregarClinicaDeshabilitado = rolActual !== "Administrador";

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Clínicas</h2>

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Buscar clínica..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border p-2 w-full rounded-lg mr-4"
        />
        <button
          type="button"
          onClick={() =>
            !agregarClinicaDeshabilitado &&
            setMostrarFormulario(!mostrarFormulario)
          }
          disabled={agregarClinicaDeshabilitado}
          className={`px-4 py-2 rounded text-white 
            ${
              agregarClinicaDeshabilitado
                ? "bg-gray-400 cursor-not-allowed"
                : mostrarFormulario
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
        >
          {mostrarFormulario ? "Cancelar" : "Agregar clínica"}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2">Nueva clínica</h3>
          <input
            name="nombre_clinica"
            placeholder="Nombre de la clínica"
            value={nuevaClinica.nombre_clinica}
            onChange={handleChangeClinica}
            className="p-2 border rounded w-full mb-4"
          />
          <button
            type="button"
            onClick={agregarClinica}
            disabled={guardando || !nuevaClinica.nombre_clinica.trim()}
            className={`px-4 py-2 rounded text-white 
                ${
                  guardando
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }
              `}
          >
            {guardando ? "Guardando..." : "Guardar clínica"}
          </button>
        </div>
      )}

      <div className="min-h-[120px]">
        {cargando ? (
          <div className="text-center text-gray-500">Cargando clínicas…</div>
        ) : (
          <>
            <table className="min-w-full border border-gray-300 rounded-lg text-center">
              <thead className="bg-gray-300 text-black">
                <tr>
                  <th className="py-2 px-4">ID</th>
                  <th className="py-2 px-4">Nombre Clínica</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(inicio, fin).map((c) => (
                  <tr key={c.id_clinica} className="border-b hover:bg-blue-100">
                    <td className="py-2">{c.id_clinica}</td>
                    <td className="py-2">{c.nombre_clinica}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtrados.length === 0 && (
              <div className="text-center text-gray-500 mt-4">
                No hay resultados.
              </div>
            )}

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
                onClick={() =>
                  setPagina((p) => Math.min(totalPaginas, p + 1))
                }
                disabled={paginaAjustada === totalPaginas}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                ➡️
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Clinicas;
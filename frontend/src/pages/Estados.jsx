import { useEffect, useState } from "react";

function Estados() {
  const [estados, setEstados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 6;

  useEffect(() => {
    fetch("http://localhost:5000/api/estados")
      .then(res => res.json())
      .then(data => setEstados(data))
      .catch(() => console.error("No se pudieron cargar estados"));
  }, []);

  const filtrados = Array.isArray(estados)
    ? estados.filter(e =>
        e.estado?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const inicio = (pagina - 1) * porPagina;
  const fin = inicio + porPagina;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Estados de Empleado</h2>

      <input
        type="text"
        placeholder="Buscar estado..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="border p-2 mb-4 w-full rounded-lg"
      />

      <table className="min-w-full border border-gray-300 rounded-lg text-center">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="py-2 px-4">ID</th>
            <th className="py-2 px-4">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.slice(inicio, fin).map(e => (
            <tr key={e.id_estado} className="border-b hover:bg-gray-100">
              <td className="py-2">{e.id_estado}</td>
              <td className="py-2">{e.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginación */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <button
          onClick={() => setPagina(pagina - 1)}
          disabled={pagina === 1}
          className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
        >
          ⬅️
        </button>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <button
          onClick={() => setPagina(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
        >
          ➡️
        </button>
      </div>
    </div>
  );
}

export default Estados;
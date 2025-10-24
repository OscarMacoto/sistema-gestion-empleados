import { useEffect, useState } from "react";

function Clinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 6;

  const [nuevaClinica, setNuevaClinica] = useState({ nombre_clinica: "" });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    cargarClinicas();
  }, []);

  const cargarClinicas = () => {
    fetch("http://localhost:5000/api/clinicas")
      .then(res => res.json())
      .then(data => setClinicas(data))
      .catch(() => console.error("No se pudieron cargar las clínicas"));
  };

  const handleChangeClinica = (e) => {
    setNuevaClinica({ ...nuevaClinica, [e.target.name]: e.target.value });
  };

  const agregarClinica = async () => {
    try {
      await fetch("http://localhost:5000/api/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaClinica),
      });
      alert("Clínica agregada correctamente");
      setNuevaClinica({ nombre_clinica: "" });
      setMostrarFormulario(false);
      cargarClinicas();
    } catch (error) {
      alert("Error al agregar clínica");
      console.error(error);
    }
  };

  const filtrados = Array.isArray(clinicas)
    ? clinicas.filter(c =>
        c.nombre_clinica?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const inicio = (pagina - 1) * porPagina;
  const fin = inicio + porPagina;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Clínicas</h2>

      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          placeholder="Buscar clínica..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border p-2 w-full rounded-lg mr-4"
        />
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
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
            onClick={agregarClinica}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Guardar clínica
          </button>
        </div>
      )}

      <table className="min-w-full border border-gray-300 rounded-lg text-center">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="py-2 px-4">ID</th>
            <th className="py-2 px-4">Nombre Clínica</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.slice(inicio, fin).map(c => (
            <tr key={c.id_clinica} className="border-b hover:bg-gray-100">
              <td className="py-2">{c.id_clinica}</td>
              <td className="py-2">{c.nombre_clinica}</td>
            </tr>
          ))}
        </tbody>
      </table>

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

export default Clinicas;
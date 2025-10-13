import { useEffect, useState } from "react";

function SSO() {
  const [sso, setSso] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 6;

  useEffect(() => {
    fetch("http://localhost:5000/api/sso")
      .then((res) => res.json())
      .then((data) => setSso(data))
      .catch(() => console.error("Error al cargar datos SSO"));
  }, []);

  const filtrados = sso.filter((u) =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.ceil(filtrados.length / porPagina);
  const inicio = (pagina - 1) * porPagina;
  const fin = inicio + porPagina;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Cuentas SSO</h2>

      <input
        type="text"
        placeholder="Buscar usuario..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="border p-2 mb-4 w-full rounded-lg"
      />

      <table className="min-w-full border border-gray-300 rounded-lg">
        <thead className="bg-blue-600 text-white text-center">
          <tr>
            <th className="py-2 px-4">ID Empleado</th>
            <th className="py-2 px-4">Nombre</th>
            <th className="py-2 px-4">Login</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {filtrados.slice(inicio, fin).map((u) => (
            <tr key={u.id_empleado} className="border-b hover:bg-gray-100">
              <td className="py-2">{u.id_empleado}</td>
              <td className="py-2">{u.nombre}</td>
              <td className="py-2">{u.L_login.slice(0,10)}</td>
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

export default SSO;

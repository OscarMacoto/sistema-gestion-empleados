import { useEffect, useState } from "react"; 
  
function Empleados() { 
  const [empleados, setEmpleados] = useState([]); 
  const [busqueda, setBusqueda] = useState(""); 
  const [pagina, setPagina] = useState(1); 
  const porPagina = 6; 
  
  useEffect(() => { 
    fetch("http://localhost:5000/api/empleados") 
      .then(res => res.json()) 
      .then(data => setEmpleados(data)) 
      .catch(() => console.error("No se pudieron cargar los empleados")); 
  }, []); 

  const filtrados = empleados.filter(e => 
    e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    e.DNI?.toLowerCase().includes(busqueda.toLowerCase()) 
  ); 
  
  const totalPaginas = Math.ceil(filtrados.length / porPagina); 
  const inicio = (pagina - 1) * porPagina; 
  const fin = inicio + porPagina;  
  const formatFecha = fecha => 
    fecha ? new Date(fecha).toISOString().split("T")[0] : ""; 
  
  return ( 
    <div className="p-6 bg-white rounded-2xl shadow-md"> 
      <h2 className="text-2xl font-bold mb-4 text-center">Empleados</h2> 
      <input 
        type="text" 
        placeholder="Buscar por nombre o DNI..." 
        value={busqueda} 
        onChange={e => setBusqueda(e.target.value)} 
        className="border p-2 mb-4 w-full rounded-lg" 
      /> 
  
      <table className="min-w-full border border-gray-300 rounded-lg text-center"> 
        <thead className="bg-blue-600 text-white"> 
          <tr> 
            <th className="py-2 px-4">ID</th> 
            <th className="py-2 px-4">Nombre</th> 
            <th className="py-2 px-4">DNI</th> 
            <th className="py-2 px-4">Correo</th> 
            <th className="py-2 px-4">Fecha Ingreso</th> 
            <th className="py-2 px-4">Teléfono</th> 
            <th className="py-2 px-4">Dirección</th> 
            <th className="py-2 px-4">Clínica</th> 
            <th className="py-2 px-4">Estado</th> 
          </tr> 
        </thead> 
        <tbody> 
          {filtrados.slice(inicio, fin).map(e => ( 
            <tr key={e.id_empleado} className="border-b hover:bg-gray-100"> 
              <td className="py-2">{e.id_empleado}</td> 
              <td className="py-2">{e.nombre}</td> 
              <td className="py-2">{e.DNI}</td> 
              <td className="py-2">{e.correo}</td> 
              <td className="py-2">{formatFecha(e.fecha_ingreso)}</td> 
              <td className="py-2">{e.telefono}</td> 
              <td className="py-2">{e.direccion}</td> 
              <td className="py-2">{e.clinica}</td> 
              <td className="py-2">{e.estado}</td> 
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
 
export default Empleados; 
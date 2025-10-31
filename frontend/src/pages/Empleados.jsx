import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";

// Componente reutilizable para selects
const SelectInput = ({ name, value, onChange, options, placeholder }) => (
  <select name={name} value={value} onChange={onChange} className="p-2 border rounded text-sm">
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={opt.id ?? opt.id_estado ?? opt.id_clinica} value={opt.id ?? opt.id_estado ?? opt.id_clinica}>
        {opt.descripcion ?? opt.nombre_clinica ?? opt.nombre}
      </option>
    ))}
  </select>
);

// Componente para subir fotos
const FotoInput = ({ foto, setFoto }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input type="file" onChange={handleChange} className="p-2 border rounded text-sm"/>
      {foto && <img src={`data:image/jpeg;base64,${foto}`} alt="Empleado" className="w-24 h-24 rounded-2xl object-cover shadow-md border border-gray-200 mt-2"/>}
    </div>
  );
};

const Empleado = () => {
  const { accounts } = useMsal();
  const [empleados, setEmpleados] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [cargandoImport, setCargandoImport] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const empleadosPorPagina = 10;

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroClinica, setFiltroClinica] = useState("");

  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "", DNI: "", correo: "", telefono: "", direccion: "", id_estado: "", id_clinica: "", foto: null
  });

  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [estados, setEstados] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [usuarioActivo, setUsuarioActivo] = useState({ nombre: "", correo: "" });

  const inputFileRef = useRef(null);

  useEffect(() => {
    if (accounts.length > 0) setUsuarioActivo({ nombre: accounts[0].name, correo: accounts[0].username });
  }, [accounts]);

  useEffect(() => {
    obtenerEmpleados();
    obtenerEstados();
    obtenerClinicas();
  }, []);

  const obtenerEmpleados = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/empleados");
      setEmpleados(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error al obtener empleados:", error);
      setEmpleados([]);
    }
  };

  const obtenerEstados = async () => {
    try { const res = await axios.get("http://localhost:5000/api/empleados/estados/lista"); setEstados(res.data); } 
    catch (error) { console.error(error); }
  };

  const obtenerClinicas = async () => {
    try { const res = await axios.get("http://localhost:5000/api/empleados/clinicas/lista"); setClinicas(res.data); } 
    catch (error) { console.error(error); }
  };

  const handleChangeNuevo = (e) => setNuevoEmpleado({ ...nuevoEmpleado, [e.target.name]: e.target.value });

  const agregarEmpleado = async () => {
    if (!usuarioActivo.correo) return alert("No se pudo identificar al usuario activo.");
    try {
      await axios.post("http://localhost:5000/api/empleados", { ...nuevoEmpleado, usuario_email: usuarioActivo.correo });
      alert("Empleado agregado correctamente");
      setNuevoEmpleado({ nombre: "", DNI: "", correo: "", telefono: "", direccion: "", id_estado: "", id_clinica: "", foto: null });
      obtenerEmpleados(); setMostrarFormulario(false);
    } catch (error) { alert("Error al agregar empleado: " + error.response?.data?.error); console.error(error); }
  };

  const actualizarEmpleado = async () => {
    if (!empleadoEditando.id_estado || !empleadoEditando.id_clinica) return alert("Debes seleccionar Estado y Clínica");
    if (!usuarioActivo.correo) return alert("No se ha podido identificar al usuario activo.");
    try {
      await axios.put(
        `http://localhost:5000/api/empleados/${empleadoEditando.id_empleado}`,
        { id_estado: Number(empleadoEditando.id_estado), id_clinica: Number(empleadoEditando.id_clinica), usuario_email: usuarioActivo.correo, foto: empleadoEditando.foto }
      );
      alert("Empleado actualizado correctamente");
      setEmpleadoEditando(null); obtenerEmpleados();
    } catch (error) { alert(error.response?.data?.error || "Error al actualizar empleado"); console.error(error); }
  };

  const eliminarEmpleado = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este empleado?")) return;
    try {
      const res = await axios.delete(`http://localhost:5000/api/empleados/${id}`, { data: { usuario_email: usuarioActivo.correo } });
      alert(res.data.message || "Empleado eliminado correctamente.");
      obtenerEmpleados();
    } catch (error) { alert(error.response?.data?.error || "Error al eliminar empleado"); console.error(error); }
  };

  const seleccionarEmpleado = (empleado) => setEmpleadoEditando({ ...empleado, estado_text: empleado.estado, clinica_text: empleado.clinica });

  // Filtros y paginación
  const normalizar = (texto) => texto?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";
  const empleadosFiltrados = empleados.filter(e => 
    normalizar(e.nombre).includes(normalizar(filtroNombre)) &&
    (filtroEstado === "" || normalizar(e.estado) === normalizar(filtroEstado)) &&
    (filtroClinica === "" || normalizar(e.clinica) === normalizar(filtroClinica))
  );
  const indiceUltimo = paginaActual * empleadosPorPagina;
  const indicePrimero = indiceUltimo - empleadosPorPagina;
  const empleadosActuales = empleadosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(empleadosFiltrados.length / empleadosPorPagina);
  const formatFecha = (fecha) => fecha?.split("T")[0] || "";

  // Excel
  const exportarExcel = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/empleados/exportar", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.setAttribute("download", "empleados.xlsx"); document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { alert("No se pudo exportar el archivo Excel"); console.error(error); }
  };

  const importarExcel = async (file) => {
    if (!file) return alert("Selecciona un archivo primero");
    setCargandoImport(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("usuario_email", usuarioActivo.correo);
      const res = await axios.post("http://localhost:5000/api/empleados/importar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert(res.data.message || "Empleados importados correctamente");
      setArchivo(null); obtenerEmpleados();
    } catch (error) { alert("Error al importar archivo Excel"); console.error(error); }
    finally { setCargandoImport(false); }
  };

  const limpiarFiltros = () => { setFiltroNombre(""); setFiltroEstado(""); setFiltroClinica(""); };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center mb-6">Gestión de Empleados</h2>
      <p className="mb-4 text-right text-gray-700">Usuario actual: {usuarioActivo.nombre || "Sistema"}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-blue-700">{mostrarFormulario ? "Cancelar" : "Agregar empleado"}</button>
        <button onClick={exportarExcel} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Exportar Excel</button>

        {/* Botón único de importación */}
        <input 
          type="file" 
          accept=".xlsx" 
          style={{ display: "none" }} 
          ref={inputFileRef} 
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setArchivo(file);
            await importarExcel(file);
          }}
        />
        <button 
          onClick={() => inputFileRef.current.click()}
          disabled={cargandoImport}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          {cargandoImport ? "Importando..." : "Importar Excel"}
        </button>
      </div>

      {/* Formulario Agregar */}
      {mostrarFormulario && (
        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2">Nuevo empleado</h3>
          <div className="grid grid-cols-2 gap-4">
            {["nombre","DNI","correo","telefono","direccion"].map(f => (
              <input key={f} name={f} placeholder={f} value={nuevoEmpleado[f]} onChange={handleChangeNuevo} className="p-2 border rounded text-sm"/>
            ))}
            <SelectInput name="id_estado" value={nuevoEmpleado.id_estado} onChange={handleChangeNuevo} options={estados} placeholder="Seleccionar estado..."/>
            <SelectInput name="id_clinica" value={nuevoEmpleado.id_clinica} onChange={handleChangeNuevo} options={clinicas} placeholder="Seleccionar clínica..."/>
            <FotoInput foto={nuevoEmpleado.foto} setFoto={(foto) => setNuevoEmpleado({...nuevoEmpleado,foto})}/>
          </div>
          <div className="flex justify-center mt-4"><button onClick={agregarEmpleado} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Guardar empleado</button></div>
        </div>
      )}

      {/* Formulario Editar */}
      {empleadoEditando && (
        <div className="bg-yellow-100 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2">Editar empleado #{empleadoEditando.id_empleado}</h3>
          <div className="grid grid-cols-2 gap-4">
            <SelectInput name="id_estado" value={empleadoEditando.id_estado} onChange={(e)=>setEmpleadoEditando({...empleadoEditando,id_estado:e.target.value})} options={estados} placeholder="Seleccionar estado..."/>
            <SelectInput name="id_clinica" value={empleadoEditando.id_clinica} onChange={(e)=>setEmpleadoEditando({...empleadoEditando,id_clinica:e.target.value})} options={clinicas} placeholder="Seleccionar clínica..."/>
            <FotoInput foto={empleadoEditando.foto} setFoto={(foto)=>setEmpleadoEditando({...empleadoEditando,foto})}/>
          </div>
          <div className="flex justify-center mt-4 gap-4">
            <button onClick={actualizarEmpleado} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Guardar cambios</button>
            <button onClick={()=>setEmpleadoEditando(null)} className="bg-red-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla y filtros */}
      <div className="overflow-x-auto">
        <div className="flex flex-wrap gap-4 mb-4">
          <input type="text" placeholder="Buscar por nombre" value={filtroNombre} onChange={(e)=>setFiltroNombre(e.target.value)} className="p-2 border rounded text-sm"/>
          <select value={filtroEstado} onChange={(e)=>setFiltroEstado(e.target.value)} className="p-2 border rounded text-sm"><option value="">Todos los estados</option>{estados.map(e=><option key={e.id_estado} value={e.descripcion}>{e.descripcion}</option>)}</select>
          <select value={filtroClinica} onChange={(e)=>setFiltroClinica(e.target.value)} className="p-2 border rounded text-sm"><option value="">Todas las clínicas</option>{clinicas.map(c=><option key={c.id_clinica} value={c.nombre_clinica}>{c.nombre_clinica}</option>)}</select>
          <button onClick={limpiarFiltros} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700">Limpiar filtros</button>
        </div>

        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg text-sm">
          <thead>
            <tr className="bg-blue-200">
              <th className="py-1 px-2 border">Foto</th>
              <th className="py-1 px-2 border">ID</th>
              <th className="py-1 px-2 border">Nombre</th>
              <th className="py-1 px-2 border">DNI</th>
              <th className="py-1 px-2 border">Correo</th>
              <th className="py-1 px-2 border">Fecha ingreso</th>
              <th className="py-1 px-2 border">Teléfono</th>
              <th className="py-1 px-2 border">Dirección</th>
              <th className="py-1 px-2 border">Estado</th>
              <th className="py-1 px-2 border">Clínica</th>
              <th className="py-1 px-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleadosActuales.length > 0 ? empleadosActuales.map(e => (
              <tr key={e.id_empleado} className="text-center border-b">
                <td className="py-1 px-2">
                  {e.foto ? <img src={`data:image/jpeg;base64,${e.foto}`} alt="Empleado" className="w-20 h-20 rounded-2xl object-cover shadow-md border border-gray-200 mx-auto"/> : <div className="w-20 h-20 bg-gray-300 rounded-2xl shadow-md border border-gray-200 mx-auto"></div>}
                </td>
                <td className="py-1 px-2">{e.id_empleado}</td>
                <td className="py-1 px-2">{e.nombre}</td>
                <td className="py-1 px-2">{e.DNI}</td>
                <td className="py-1 px-2">{e.correo}</td>
                <td className="py-1 px-2">{formatFecha(e.fecha_ingreso)}</td>
                <td className="py-1 px-2">{e.telefono}</td>
                <td className="py-1 px-2">{e.direccion}</td>
                <td className="py-1 px-2">{e.estado}</td>
                <td className="py-1 px-2">{e.clinica}</td>
                <td className="py-1 px-2 flex flex-col gap-1 items-center justify-center">
                  <button onClick={()=>seleccionarEmpleado(e)} className="bg-yellow-400 text-white px-2 py-1 rounded hover:bg-yellow-500 text-xs">Editar</button>
                  <button onClick={()=>eliminarEmpleado(e.id_empleado)} className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs">Eliminar</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="11" className="text-center py-4 text-gray-500">No se encontraron empleados.</td></tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="flex justify-center mt-4 gap-2">
          <button disabled={paginaActual === 1} onClick={()=>setPaginaActual(paginaActual-1)} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">Anterior</button>
          <span className="px-2 py-1">{paginaActual} / {totalPaginas}</span>
          <button disabled={paginaActual===totalPaginas || totalPaginas===0} onClick={()=>setPaginaActual(paginaActual+1)} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">Siguiente</button>
        </div>
      </div>
    </div>
  );
};

export default Empleado;

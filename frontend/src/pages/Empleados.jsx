import React, { useEffect, useState } from "react";
import axios from "axios";

const Empleado = () => {
  const [empleados, setEmpleados] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const empleadosPorPagina = 10;

  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "",
    DNI: "",
    correo: "",
    telefono: "",
    direccion: "",
    id_estado: "",
    id_clinica: "",
  });

  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [estados, setEstados] = useState([]);
  const [clinicas, setClinicas] = useState([]);

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
    try {
      const res = await axios.get("http://localhost:5000/api/empleados/estados/lista");
      setEstados(res.data);
    } catch (error) {
      console.error("Error al obtener estados:", error);
    }
  };

  const obtenerClinicas = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/empleados/clinicas/lista");
      setClinicas(res.data);
    } catch (error) {
      console.error("Error al obtener clínicas:", error);
    }
  };

  const handleChangeNuevo = (e) => {
    setNuevoEmpleado({ ...nuevoEmpleado, [e.target.name]: e.target.value });
  };

  const agregarEmpleado = async () => {
    try {
      await axios.post("http://localhost:5000/api/empleados", nuevoEmpleado);
      alert("Empleado agregado correctamente");
      setNuevoEmpleado({
        nombre: "",
        DNI: "",
        correo: "",
        telefono: "",
        direccion: "",
        id_estado: "",
        id_clinica: "",
      });
      obtenerEmpleados();
      setMostrarFormulario(false);
    } catch (error) {
      alert("Error al agregar empleado: " + error.response?.data?.error);
      console.error(error);
    }
  };

  const eliminarEmpleado = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este empleado?")) {
      try {
        await axios.delete(`http://localhost:5000/api/empleados/${id}`);
        obtenerEmpleados();
      } catch (error) {
        alert("Error al eliminar empleado");
        console.error(error);
      }
    }
  };

const seleccionarEmpleado = (empleado) => {
  setEmpleadoEditando({
    id_empleado: empleado.id_empleado,
    id_estado: "",
    id_clinica: "",
    estado_text: empleado.estado ?? "",
    clinica_text: empleado.clinica ?? "",
  });
};

useEffect(() => {
  if (!empleadoEditando) return;
  if (estados.length === 0 || clinicas.length === 0) return;

  const estadoEncontrado = estados.find(
    (e) =>
      e.descripcion?.trim().toLowerCase() ===
      empleadoEditando.estado_text?.trim().toLowerCase()
  );

  const clinicaEncontrada = clinicas.find(
    (c) =>
      c.nombre_clinica?.trim().toLowerCase() ===
      empleadoEditando.clinica_text?.trim().toLowerCase()
  );

  setEmpleadoEditando((prev) => ({
    ...prev,
    id_estado: estadoEncontrado ? estadoEncontrado.id_estado : "",
    id_clinica: clinicaEncontrada ? clinicaEncontrada.id_clinica : "",
  }));
}, [empleadoEditando?.estado_text, empleadoEditando?.clinica_text, estados, clinicas]);

const actualizarEmpleado = async () => {
  try {
    await axios.put(
      `http://localhost:5000/api/empleados/${empleadoEditando.id_empleado}`,
      {
        id_estado: empleadoEditando.id_estado,
        id_clinica: empleadoEditando.id_clinica,
      }
    );
    alert("Empleado actualizado correctamente");
    setEmpleadoEditando(null);
    obtenerEmpleados();
  } catch (error) {
    alert("Error al actualizar empleado");
    console.error(error);
  }
};


  const indiceUltimo = paginaActual * empleadosPorPagina;
  const indicePrimero = indiceUltimo - empleadosPorPagina;
  const empleadosActuales = empleados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(empleados.length / empleadosPorPagina);

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">Gestión de Empleados</h2>

      <div className="flex justify-left mb-4">
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {mostrarFormulario ? "Cancelar" : "Agregar empleado"}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2">Nuevo empleado</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="nombre" placeholder="Nombre" value={nuevoEmpleado.nombre} onChange={handleChangeNuevo} className="p-2 border rounded text-sm" />
            <input name="DNI" placeholder="DNI" value={nuevoEmpleado.DNI} onChange={handleChangeNuevo} className="p-2 border rounded text-sm" />
            <input name="correo" placeholder="Correo" value={nuevoEmpleado.correo} onChange={handleChangeNuevo} className="p-2 border rounded text-sm" />
            <input name="telefono" placeholder="Teléfono" value={nuevoEmpleado.telefono} onChange={handleChangeNuevo} className="p-2 border rounded text-sm" />
            <input name="direccion" placeholder="Dirección" value={nuevoEmpleado.direccion} onChange={handleChangeNuevo} className="p-2 border rounded text-sm" />
            <select name="id_estado" value={nuevoEmpleado.id_estado} onChange={handleChangeNuevo} className="p-2 border rounded text-sm">
              <option value="">Seleccionar estado...</option>
              {estados.map((estado) => (
                <option key={estado.id_estado} value={estado.id_estado}>
                  {estado.descripcion}
                </option>
              ))}
            </select>
            <select name="id_clinica" value={nuevoEmpleado.id_clinica} onChange={handleChangeNuevo} className="p-2 border rounded text-sm">
              <option value="">Seleccionar clínica...</option>
              {clinicas.map((clinica) => (
                <option key={clinica.id_clinica} value={clinica.id_clinica}>
                  {clinica.nombre_clinica}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center mt-4">
            <button onClick={agregarEmpleado} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Guardar empleado
            </button>
          </div>
        </div>
      )}

      {empleadoEditando && (
        <div className="bg-yellow-100 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2">Editar empleado #{empleadoEditando.id_empleado}</h3>
          <div className="grid grid-cols-2 gap-4">
            <select name="id_estado" value={empleadoEditando.id_estado} onChange={(e) => setEmpleadoEditando({ ...empleadoEditando, id_estado: e.target.value })} className="p-2 border rounded text-sm">
              <option value="">Seleccionar estado...</option>
              {estados.map((estado) => (
                <option key={estado.id_estado} value={estado.id_estado}>
                  {estado.descripcion}
                </option>
              ))}
            </select>
            <select name="id_clinica" value={empleadoEditando.id_clinica} onChange={(e) => setEmpleadoEditando({ ...empleadoEditando, id_clinica: e.target.value })} className="p-2 border rounded text-sm">
              <option value="">Seleccionar clínica...</option>
              {clinicas.map((clinica) => (
                <option key={clinica.id_clinica} value={clinica.id_clinica}>
                  {clinica.nombre_clinica}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center mt-4 gap-4">
            <button onClick={actualizarEmpleado} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Guardar cambios
            </button>
            <button onClick={() => setEmpleadoEditando(null)} className="bg-red-400 text-white px-4 py-2 rounded hover:bg-gray-500">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg text-sm">
          <thead>
            <tr className="bg-blue-200">
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
            {empleadosActuales.length > 0 ? (
              empleadosActuales.map((empleado) => (
                <tr key={empleado.id_empleado} className="text-center border-b">
                  <td className="py-1 px-2">{empleado.id_empleado}</td>
                  <td className="py-1 px-2">{empleado.nombre}</td>
                  <td className="py-1 px-2">{empleado.DNI}</td>
                  <td className="py-1 px-2">{empleado.correo}</td>
                  <td className="py-1 px-2">{empleado.fecha_ingreso}</td>
                  <td className="py-1 px-2">{empleado.telefono}</td>
                  <td className="py-1 px-2">{empleado.direccion}</td>
                  <td className="py-1 px-2">{empleado.estado}</td>
                  <td className="py-1 px-2">{empleado.clinica}</td>
                  <td className="py-1 px-2">
                    <button onClick={() => eliminarEmpleado(empleado.id_empleado)} className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-sm">
                      Eliminar
                    </button>
                    <button onClick={() => seleccionarEmpleado(empleado)} className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm">
                      Actualizar 
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-3 text-gray-500">
                  No hay empleados registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: totalPaginas }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => setPaginaActual(i + 1)}
            className={`px-3 py-1 rounded text-sm ${paginaActual === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Empleado;
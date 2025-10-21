import React, { useEffect, useState } from "react";
import axios from "axios";

const Empleado = () => {
  const [empleados, setEmpleados] = useState([]);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "",
    DNI: "",
    correo: "",
    telefono: "",
    direccion: "",
    id_estado: "",
    id_clinica: "",
  });
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

  const handleChange = (e) => {
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
          <div className="grid grid-cols-2 gap-4">
            <input name="nombre" placeholder="Nombre" value={nuevoEmpleado.nombre} onChange={handleChange} className="p-2 border rounded" />
            <input name="DNI" placeholder="DNI" value={nuevoEmpleado.DNI} onChange={handleChange} className="p-2 border rounded" />
            <input name="correo" placeholder="Correo" value={nuevoEmpleado.correo} onChange={handleChange} className="p-2 border rounded" />
            <input name="telefono" placeholder="Teléfono" value={nuevoEmpleado.telefono} onChange={handleChange} className="p-2 border rounded" />
            <input name="direccion" placeholder="Dirección" value={nuevoEmpleado.direccion} onChange={handleChange} className="p-2 border rounded" />

            <select name="id_estado" value={nuevoEmpleado.id_estado} onChange={handleChange} className="p-2 border rounded">
              <option value="">Seleccionar estado...</option>
              {estados.map((estado) => (
                <option key={estado.id_estado} value={estado.id_estado}>
                  {estado.descripcion}
                </option>
              ))}
            </select>

            <select name="id_clinica" value={nuevoEmpleado.id_clinica} onChange={handleChange} className="p-2 border rounded">
              <option value="">Seleccionar clínica...</option>
              {clinicas.map((clinica) => (
                <option key={clinica.id_clinica} value={clinica.id_clinica}>
                  {clinica.nombre_clinica}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center mt-4">
            <button
              onClick={agregarEmpleado}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Guardar empleado
            </button>
          </div>
        </div>
      )}

      <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
        <thead>
          <tr className="bg-blue-200">
            <th className="py-2 px-4 border">ID</th>
            <th className="py-2 px-4 border">Nombre</th>
            <th className="py-2 px-4 border">DNI</th>
            <th className="py-2 px-4 border">Correo</th>
            <th className="py-2 px-4 border">Fecha ingreso</th>
            <th className="py-2 px-4 border">Teléfono</th>
            <th className="py-2 px-4 border">Dirección</th>
            <th className="py-2 px-4 border">Estado</th>
            <th className="py-2 px-4 border">Clínica</th>
            <th className="py-2 px-4 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.length > 0 ? (
            empleados.map((empleado) => (
              <tr key={empleado.id_empleado} className="text-center border-b">
                <td className="py-2 px-4">{empleado.id_empleado}</td>
                <td className="py-2 px-4">{empleado.nombre}</td>
                <td className="py-2 px-4">{empleado.DNI}</td>
                <td className="py-2 px-4">{empleado.correo}</td>
                <td className="py-2 px-4">{empleado.fecha_ingreso}</td>
                <td className="py-2 px-4">{empleado.telefono}</td>
                <td className="py-2 px-4">{empleado.direccion}</td>
                <td className="py-2 px-4">{empleado.estado}</td>
                <td className="py-2 px-4">{empleado.clinica}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => eliminarEmpleado(empleado.id_empleado)}
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
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
  );
};

export default Empleado;
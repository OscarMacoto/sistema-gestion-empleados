import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";


const SelectInput = ({ name, value, onChange, options, placeholder, disabled }) => {
  const getId = (opt) => opt.id_estado || opt.id_clinica || opt.id_rol;
  const getLabel = (opt) => opt.descripcion || opt.nombre_clinica || opt.nombre_rol;

  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`p-2 border rounded text-sm ${
        disabled ? "bg-gray-200 cursor-not-allowed" : ""
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={getId(opt)} value={getId(opt)}>
          {getLabel(opt)}
        </option>
      ))}
    </select>
  );
};


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
      <input
        type="file"
        onChange={handleChange}
        className="p-2 border rounded text-sm"
      />
      {foto && (
        <img
          src={`data:image/jpeg;base64,${foto}`}
          alt="Empleado"
          className="w-24 h-24 rounded-2xl object-cover shadow-md border border-gray-200 mt-2"
        />
      )}
    </div>
  );
};


const Empleado = () => {
  const { accounts } = useMsal();
  const [empleados, setEmpleados] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const empleadosPorPagina = 10;
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroClinica, setFiltroClinica] = useState("");
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: "",
    DNI: "",
    correo: "",
    telefono: "",
    direccion: "",
    id_estado: "",
    id_clinica: "",
    id_rol: 3,
    foto: null,
  });
  const [empleadoEditando, setEmpleadoEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [estados, setEstados] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [usuarioActivo, setUsuarioActivo] = useState({ nombre: "", correo: "" });
  const inputFileRef = useRef(null);
  const [cargandoImport, setCargandoImport] = useState(false);

  // GET USUARIO ACTIVO

  useEffect(() => {
    if (accounts.length > 0) {
      setUsuarioActivo({ nombre: accounts[0].name, correo: accounts[0].username });
    }
  }, [accounts]);

  // GET LISTAS

  const obtenerEmpleados = useCallback(async () => {
    if (!usuarioActivo.correo) return;
    try {
      const res = await axios.get("http://localhost:5000/api/empleados", {
        params: { usuario_email: usuarioActivo.correo },
      });
      setEmpleados(res.data.empleados || []);
    } catch (error) {
      console.error("Error al obtener empleados:", error);
    }
  }, [usuarioActivo]);

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

  const obtenerRoles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/empleados/roles/lista");
      setRoles(res.data);
    } catch (error) {
      console.error("Error al obtener roles:", error);
    }
  };

  useEffect(() => {
    obtenerEmpleados();
    obtenerEstados();
    obtenerClinicas();
    obtenerRoles();
  }, [obtenerEmpleados]);

  const normalizar = (texto) =>
    texto?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

  const empleadosFiltrados = empleados.filter(
    (e) =>
      normalizar(e.nombre).includes(normalizar(filtroNombre)) &&
      (filtroEstado === "" || e.id_estado === Number(filtroEstado)) &&
      (filtroClinica === "" || e.id_clinica === Number(filtroClinica))
  );

  const totalPaginas = Math.ceil(empleadosFiltrados.length / empleadosPorPagina);
  const indiceUltimo = paginaActual * empleadosPorPagina;
  const indicePrimero = indiceUltimo - empleadosPorPagina;
  const empleadosActuales = empleadosFiltrados.slice(indicePrimero, indiceUltimo);

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  };

  // ADD (POST) EMPLEADO
 
  const handleChangeNuevo = (e) =>
    setNuevoEmpleado({ ...nuevoEmpleado, [e.target.name]: e.target.value });

  const agregarEmpleado = async () => {
    if (
      !nuevoEmpleado.nombre ||
      !nuevoEmpleado.DNI ||
      !nuevoEmpleado.correo ||
      !nuevoEmpleado.id_estado ||
      !nuevoEmpleado.id_clinica
    )
      return alert("Por favor completa todos los campos obligatorios.");

    const estadoSeleccionado = estados.find(
      (e) => e.id_estado === nuevoEmpleado.id_estado
    );
    const fechaSalida =
      ["Despedido", "Renuncia"].includes(estadoSeleccionado?.descripcion)
        ? new Date()
        : null;

    const empleadoAGuardar = {
      ...nuevoEmpleado,
      id_rol:
        Number(nuevoEmpleado.id_rol) ||
        roles.find((r) => r.nombre_rol === "Empleado de planta")?.id_rol ||
        3,
      usuario_email: usuarioActivo.correo,
      fecha_salida: fechaSalida,
    };

    try {
      await axios.post("http://localhost:5000/api/empleados", empleadoAGuardar);
      alert("Empleado agregado correctamente.");
      setNuevoEmpleado({
        nombre: "",
        DNI: "",
        correo: "",
        telefono: "",
        direccion: "",
        id_estado: "",
        id_clinica: "",
        id_rol: "",
        foto: null,
      });
      setMostrarFormulario(false);
      obtenerEmpleados();
    } catch (error) {
      console.error("Error al agregar empleado:", error);
      alert(error.response?.data?.error || "Error al agregar empleado.");
    }
  };

  const seleccionarEmpleado = (empleado) => {
    setEmpleadoEditando({
      ...empleado,
      id_estado:
        empleado.id_estado || estados.find((e) => e.descripcion === empleado.estado)?.id_estado || "",
      id_clinica:
        empleado.id_clinica ||
        clinicas.find((c) => c.nombre_clinica === empleado.clinica)?.id_clinica ||
        "",
      id_rol:
        empleado.id_rol ||
        roles.find((r) => r.nombre_rol === empleado.rol)?.id_rol ||
        roles.find((r) => r.nombre_rol === "Empleado de planta")?.id_rol ||
        3,
      telefono: empleado.telefono || "",
      direccion: empleado.direccion || "",
      foto: empleado.foto || null,
    });
  };

  // ACTUALIZAR EMPLEADO

  const actualizarEmpleado = async () => {
    if (!empleadoEditando.id_estado || !empleadoEditando.id_clinica)
      return alert("Debes seleccionar Estado y Clínica.");

    const estadoSeleccionado = estados.find(
      (e) => e.id_estado === empleadoEditando.id_estado
    );
    const fechaSalida =
      ["Despedido", "Renuncia"].includes(estadoSeleccionado?.descripcion)
        ? new Date()
        : null;

    try {
      await axios.put(
        `http://localhost:5000/api/empleados/${empleadoEditando.id_empleado}`,
        {
          id_estado: Number(empleadoEditando.id_estado),
          id_clinica: Number(empleadoEditando.id_clinica),
          id_rol: Number(empleadoEditando.id_rol),
          telefono: empleadoEditando.telefono,
          direccion: empleadoEditando.direccion,
          fecha_salida: fechaSalida,
          usuario_email: usuarioActivo.correo,
          foto: empleadoEditando.foto,
        }
      );
      alert("Empleado actualizado correctamente.");
      setEmpleadoEditando(null);
      obtenerEmpleados();
    } catch (error) {
      console.error("Error al actualizar empleado:", error);
      alert(error.response?.data?.error || "Error al actualizar empleado.");
    }
  };

  // ELIMINAR EMPLEADO

const eliminarEmpleado = async (id) => {
  if (!window.confirm("¿Seguro que deseas eliminar este empleado?")) return;

  try {
    await axios.delete(`http://localhost:5000/api/empleados/${id}`, {
      data: {
        usuario_email: usuarioActivo.correo || "Sistema", // ← tu variable del login
      },
    });

    alert("Empleado eliminado correctamente.");
    obtenerEmpleados();
  } catch (error) {
    console.error("Error al eliminar empleado:", error);
    alert(error.response?.data?.error || "Error al eliminar empleado.");
  }
};


  // EXPORTAR / IMPORTAR 

  const exportarExcel = async () => {
  try {
    const empleadosSinFoto = empleados.map(({ foto, ...resto }) => resto);
    const res = await axios.post(
      "http://localhost:5000/api/empleados/exportar",
      empleadosSinFoto,
      {
        responseType: "blob",
        headers: { "Content-Type": "application/json" },
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "empleados.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();

    await axios.post("http://localhost:5000/api/empleados/registrarAccion", {
      usuario_email: usuarioActivo.correo,
      accion: "Exportar Usuarios",
      detalles: `El usuario ${usuarioActivo.nombre} exportó la lista de empleados`,
    });

    console.log("Acción registrada correctamente.");

  } catch (error) {
    console.error("Error al exportar Excel:", error);
    alert("No se pudo exportar o registrar la acción.");
  }
};


  const importarExcel = async (file) => {
    if (!file) return alert("Selecciona un archivo primero.");
    setCargandoImport(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("usuario_email", usuarioActivo.correo);
      await axios.post("http://localhost:5000/api/empleados/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Empleados importados correctamente (si la ruta existe en backend).");
      obtenerEmpleados();
    } catch (error) {
      console.error("Error al importar Excel:", error);
      alert("No se pudo importar el archivo. Verifica que la ruta exista en backend.");
    } finally {
      setCargandoImport(false);
    }
  };

  // LIMPIAR FILTROS

  const limpiarFiltros = () => {
    setFiltroNombre("");
    setFiltroEstado("");
    setFiltroClinica("");
  };

  const rolActual = localStorage.getItem("usuario_rol");
  const exportarDeshabilitado = rolActual === "RRHH";
  const rolDeshabilitado = rolActual !== "Administrador";


  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center mb-6">Gestión de Empleados</h2>
      {/* <p className="mb-4 text-right text-gray-700">
        Usuario actual: {usuarioActivo.nombre || "Sistema"}
      </p> */}

      {/* BOTONES DE ACCIONES */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {mostrarFormulario ? "Cancelar" : "Agregar empleado"}
        </button>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportarExcel}
            disabled={exportarDeshabilitado}
            className={`px-4 py-2 rounded text-white 
               ${exportarDeshabilitado 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-green-500 hover:bg-green-600"
              }`}
>
  Exportar Excel
</button>

          <button
            onClick={() => inputFileRef.current.click()}
            disabled={cargandoImport}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {cargandoImport ? "Importando..." : "Importar Excel"}
          </button>
          <input
            type="file"
            ref={inputFileRef}
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              await importarExcel(file);
            }}
          />
        </div>
      </div>

      {/* FORMULARIO NUEVO EMPLEADO */}
      {mostrarFormulario && (
        <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-2">Nuevo empleado</h3>
          <div className="grid grid-cols-2 gap-4">
            {["nombre", "DNI", "correo", "telefono", "direccion"].map((f) => (
              <input
                key={f}
                name={f}
                placeholder={f}
                value={nuevoEmpleado[f]}
                onChange={handleChangeNuevo}
                className="p-2 border rounded text-sm"
              />
            ))}
            <SelectInput
              name="id_estado"
              value={nuevoEmpleado.id_estado}
              onChange={handleChangeNuevo}
              options={estados}
              placeholder="Seleccionar estado..."
            />
            <SelectInput
              name="id_clinica"
              value={nuevoEmpleado.id_clinica}
              onChange={handleChangeNuevo}
              options={clinicas}
              placeholder="Seleccionar clínica..."
            />
            <SelectInput
              name="id_rol"
              value={nuevoEmpleado.id_rol}
              onChange={handleChangeNuevo}
              options={roles}
              placeholder="Selecciona un rol"
              disabled={rolDeshabilitado}
            />

            <FotoInput
              foto={nuevoEmpleado.foto}
              setFoto={(foto) => setNuevoEmpleado({ ...nuevoEmpleado, foto })}
            />
          </div>
          <div className="flex justify-center mt-4">
            <button
              onClick={agregarEmpleado}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Guardar empleado
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO EDITAR EMPLEADO */}
      {empleadoEditando && (
        <div className="bg-yellow-100 p-4 rounded-lg shadow-md mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 gap-4">
            <h3 className="text-lg font-semibold mb-2">
              Editando: {empleadoEditando.nombre}
            </h3>
            <SelectInput
              name="id_estado"
              value={empleadoEditando.id_estado}
              onChange={(e) =>
                setEmpleadoEditando({ ...empleadoEditando, id_estado: e.target.value })
              }
              options={estados}
              placeholder="Seleccionar estado..."
            />
            <SelectInput
              name="id_clinica"
              value={empleadoEditando.id_clinica}
              onChange={(e) =>
                setEmpleadoEditando({ ...empleadoEditando, id_clinica: e.target.value })
              }
              options={clinicas}
              placeholder="Seleccionar clínica..."
            />
            <SelectInput
              name="id_rol"
              value={nuevoEmpleado.id_rol}
              onChange={(e) =>
                setNuevoEmpleado({ ...nuevoEmpleado, id_rol: e.target.value })
              }
              options={roles}
              placeholder="Seleccione Rol..."
              disabled={rolDeshabilitado}
            />

            <input
              type="text"
              name="telefono"
              placeholder="Teléfono"
              value={empleadoEditando.telefono || ""}
              onChange={(e) =>
                setEmpleadoEditando({ ...empleadoEditando, telefono: e.target.value })
              }
              className="p-2 border rounded text-sm"
            />
            <input
              type="text"
              name="direccion"
              placeholder="Dirección"
              value={empleadoEditando.direccion || ""}
              onChange={(e) =>
                setEmpleadoEditando({ ...empleadoEditando, direccion: e.target.value })
              }
              className="p-2 border rounded text-sm"
            />
            <div className="flex justify-start gap-2 mt-2">
              <button
                onClick={actualizarEmpleado}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Guardar cambios
              </button>
              <button
                onClick={() => setEmpleadoEditando(null)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Cancelar
              </button>
            </div>
          </div>
          <div>
            <FotoInput
              foto={empleadoEditando.foto}
              setFoto={(foto) => setEmpleadoEditando({ ...empleadoEditando, foto })}
            />
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          placeholder="Buscar por nombre..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          className="p-2 border rounded text-sm flex-1 min-w-[200px]"
        />
        <SelectInput
          name="filtroEstado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          options={estados}
          placeholder="Filtrar por estado..."
        />
        <SelectInput
          name="filtroClinica"
          value={filtroClinica}
          onChange={(e) => setFiltroClinica(e.target.value)}
          options={clinicas}
          placeholder="Filtrar por clínica..."
        />
        <button
          onClick={limpiarFiltros}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-400"
        >
          Limpiar
        </button>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 text-left text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">DNI</th>
              <th className="p-2 border">Correo</th>
              <th className="p-2 border">Teléfono</th>
              <th className="p-2 border">Dirección</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Clínica</th>
              <th className="p-2 border">Rol</th>
              <th className="p-2 border">Fecha ingreso</th>
              <th className="p-2 border">Fecha salida</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleadosActuales.map((emp) => (
              <tr key={emp.id_empleado} className="hover:bg-gray-100">
                <td className="p-2 border">{emp.nombre}</td>
                <td className="p-2 border">{emp.DNI}</td>
                <td className="p-2 border">{emp.correo}</td>
                <td className="p-2 border">{emp.telefono}</td>
                <td className="p-2 border">{emp.direccion}</td>
                <td className="p-2 border">{emp.estado}</td>
                <td className="p-2 border">{emp.clinica}</td>
                <td className="p-2 border">{emp.rol}</td>
                <td className="p-2 border">{formatFecha(emp.fecha_ingreso)}</td>
                <td className="p-2 border">{formatFecha(emp.fecha_salida)}</td>
                <td className="p-2 border flex gap-2">
                  <button
                    onClick={() => seleccionarEmpleado(emp)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarEmpleado(emp.id_empleado)}
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {empleadosActuales.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center p-4 text-gray-500">
                  No se encontraron empleados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACION */}
      <div className="flex justify-center mt-4 gap-2 flex-wrap">
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            className={`px-3 py-1 rounded ${
              num === paginaActual ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setPaginaActual(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Empleado;
import { useMsal } from "@azure/msal-react";
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

function SelfService() {
  const { accounts } = useMsal();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarPerfil = async () => {
      if (accounts.length === 0) {
        setUserData({ error: "No hay sesión activa." });
        setLoading(false);
        return;
      }

      try {
        const userEmail = accounts[0].username;
        const data = await apiGet(`/empleados/mi-perfil/${encodeURIComponent(userEmail)}`);

        setUserData(data?.data ?? data ?? {});
      } catch (err) {
        console.error("Error al obtener datos del usuario:", err);
        setUserData({ error: "No se pudo cargar la información." });
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [accounts]);

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-600">
        Cargando información...
      </div>
    );
  }

  if (userData?.error) {
    return (
      <div className="text-center mt-10 text-red-600">
        {userData.error}
      </div>
    );
  }

  const mostrar = (valor, defecto = "No registrado") => valor || defecto;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-lg mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-center">Mi Perfil</h2>
      <div className="space-y-2">
        <p><strong>Nombre:</strong> {mostrar(userData.nombre)}</p>
        <p><strong>Correo:</strong> {mostrar(userData.correo)}</p>
        <p><strong>DNI:</strong> {mostrar(userData.DNI)}</p>
        <p><strong>Teléfono:</strong> {mostrar(userData.telefono)}</p>
        <p><strong>Clínica:</strong> {mostrar(userData.clinica)}</p>
        <p><strong>Estado:</strong> {mostrar(userData.estado)}</p>
        <p><strong>Área:</strong> {mostrar(userData.nombre_area)}</p>
        <p><strong>Puesto:</strong> {mostrar(userData.puesto)}</p>
        <p>
          <strong>Fecha de ingreso:</strong>{" "}
          {userData.fecha_ingreso
            ? new Date(userData.fecha_ingreso).toLocaleDateString()
            : "No registrada"}
        </p>
      </div>
    </div>
  );
}

export default SelfService;
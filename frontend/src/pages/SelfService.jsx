import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";

function SelfService() {
  const { accounts } = useMsal();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accounts.length > 0) {
      const userEmail = accounts[0].username;

      fetch(`http://localhost:5000/api/empleados/mi-perfil/${userEmail}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setUserData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al obtener datos del usuario:", err);
          setUserData({ error: "No se pudo cargar la información." });
          setLoading(false);
        });
    }
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
        <p>
          <strong>Fecha de ingreso:</strong>{" "}
          {userData.fecha_ingreso ? new Date(userData.fecha_ingreso).toLocaleDateString() : "No registrada"}
        </p>
      </div>
    </div>
  );
}

export default SelfService;

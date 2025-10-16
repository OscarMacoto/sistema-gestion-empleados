import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";

function SelfService() {
  const { accounts } = useMsal();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (accounts.length > 0) {
      const userEmail = accounts[0].username;
      fetch(`http://localhost:5000/api/empleados/${userEmail}`)
        .then((res) => res.json())
        .then((data) => setUserData(data))
        .catch((err) =>
          console.error("Error al obtener datos del usuario:", err)
        );
    }
  }, [accounts]);

  if (!userData) {
    return (
      <div className="text-center mt-10 text-gray-600">
        Cargando información...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-lg mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-center">Mi Perfil</h2>
      <div className="space-y-2">
        <p>
          <strong>Nombre:</strong> {userData.nombre}
        </p>
        <p>
          <strong>Correo:</strong> {userData.correo}
        </p>
        <p>
          <strong>DNI:</strong> {userData.DNI}
        </p>
        <p>
          <strong>Teléfono:</strong> {userData.telefono}
        </p>
        <p>
          <strong>Clínica:</strong> {userData.clinica}
        </p>
        <p>
          <strong>Estado:</strong> {userData.estado}
        </p>
        <p>
          <strong>Fecha de ingreso:</strong>{" "}
          {new Date(userData.fecha_ingreso).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default SelfService;
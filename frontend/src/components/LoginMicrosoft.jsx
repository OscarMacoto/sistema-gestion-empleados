import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LoginMicrosoft() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    // Si ya hay sesión, establecer usuario activo
    if (accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
      navigate("/selfservice");
    }
  }, [accounts, instance, navigate]);

  const handleLogin = async () => {
    try {
      const response = await instance.loginPopup({
        scopes: ["user.read", "email", "openid", "profile"],
        prompt: "select_account",
      });

      const account = response.account;

      instance.setActiveAccount(account);

      const email = account.username;
      const nombreCompleto = account.name;
      const empleadoResponse = await fetch(
        `http://localhost:5000/api/empleados/email/${email}`
      );
      const empleadoData = await empleadoResponse.json();

      if (!empleadoData?.id_empleado) {
        alert("No tienes acceso al sistema. Contacta con RRHH.");
        return;
      }

      // Buscar el rol del empleado
      const rolResponse = await fetch(
        `http://localhost:5000/api/empleados/rol/${email}`
      );
      const rolData = await rolResponse.json();

      // Guardar en localStorage
      localStorage.setItem("usuario_email", email);
      localStorage.setItem("usuario_nombre", nombreCompleto);
      localStorage.setItem("usuario_rol", rolData?.descripcion || "Empleado");

      // Actualizar último login
      await fetch("http://localhost:5000/api/sso/actualizar-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_empleado: empleadoData.id_empleado }),
      });

      navigate("/selfservice");
    } catch (error) {
      console.error("Error en login:", error);
    }
  };

  const handleLogout = () => {
    instance.setActiveAccount(null);

    localStorage.removeItem("usuario_email");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");

    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white shadow-md rounded-xl p-5 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">
          Sistema de Gestión de Empleados
        </h1>

        {accounts.length === 0 ? (
          <>
            <p className="text-gray-600 mb-4">Inicia sesión con tu correo de ELEOS</p>
            <button
              onClick={handleLogin}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Log In
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Sesión activa como:
              <br />
              <strong>{accounts[0].name}</strong>
            </p>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginMicrosoft;

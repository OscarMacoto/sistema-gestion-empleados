import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LoginMicrosoft() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    const iniciarSesionExistente = async () => {
      if (accounts.length > 0) {
        instance.setActiveAccount(accounts[0]);

        const email = accounts[0].username;

        const rolResponse = await fetch(
          `http://localhost:5000/api/empleados/rol/${email}`
        );
        const rolData = await rolResponse.json();
        const rol = rolData?.descripcion || "Empleado";

        localStorage.setItem("usuario_rol", rol);

        if (rol === "Empleado de planta") {
          navigate("/selfservice");
        } else {
          navigate("/");
        }
      }
    };

    iniciarSesionExistente();
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

      const empleadoRes = await fetch(
        `http://localhost:5000/api/empleados/email/${email}`
      );
      const empleadoData = await empleadoRes.json();

      // Obtener rol
      const rolRes = await fetch(
        `http://localhost:5000/api/empleados/rol/${email}`
      );
      const rolData = await rolRes.json();

      const rol = rolData?.descripcion || "Empleado";
      localStorage.setItem("usuario_rol", rolData?.descripcion || "Empleado");
      window.dispatchEvent(new Event("role-updated"));


      // Guardar datos
      localStorage.setItem("usuario_email", email);
      localStorage.setItem("usuario_nombre", nombreCompleto);
      localStorage.setItem("usuario_rol", rol);

      // Actualizar último login
      await fetch("http://localhost:5000/api/auth/actualizar-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_empleado: empleadoData.id_empleado }),
      });

      if (rol === "Empleado de planta") {
        navigate("/selfservice");
      } else {
        navigate("/");
      }

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

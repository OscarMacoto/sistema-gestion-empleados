import { useMsal } from "@azure/msal-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLogout } from "../hooks/useLogout";
import { API_BASE } from "../config/api";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} → ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} → ${res.status} ${res.statusText} ${text}`);
  }
  return res.json().catch(() => ({}));
}

function LoginMicrosoft() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  useEffect(() => {
    const iniciarSesionExistente = async () => {
      if (accounts.length > 0) {
        try {
          instance.setActiveAccount(accounts[0]);
          const email = accounts[0].username;

          const rolData = await apiGet(`/empleados/rol/${encodeURIComponent(email)}`);
          const rol = rolData?.descripcion || "Empleado";

          localStorage.setItem("usuario_rol", rol);

          if (rol === "Empleado de planta") {
            navigate("/selfservice");
          } else {
            navigate("/");
          }
        } catch (e) {
          console.error("Error al recuperar sesión existente:", e);
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

      const empleadoData = await apiGet(`/empleados/email/${encodeURIComponent(email)}`);

      const rolData = await apiGet(`/empleados/rol/${encodeURIComponent(email)}`);
      const rol = rolData?.descripcion || "Empleado";

      localStorage.setItem("usuario_rol", rol);
      window.dispatchEvent(new Event("role-updated"));

      localStorage.setItem("usuario_email", email);
      localStorage.setItem("usuario_nombre", nombreCompleto);

      await apiPost("/auth/actualizar-login", {
        id_empleado: empleadoData.id_empleado,
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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white shadow-md rounded-xl p-5 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-700 mb-6">
          Sistema de Gestión de Empleados
        </h1>

        {accounts.length === 0 ? (
          <>
            <p className="text-gray-600 mb-4">
              Inicia sesión con tu correo de ELEOS
            </p>
            <button
              type="button"
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
              type="button"
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
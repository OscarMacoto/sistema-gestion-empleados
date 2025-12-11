import { Link } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

function Sidebar() {
  const { instance, accounts } = useMsal();

  const [rolUsuario, setRolUsuario] = useState(null);

  useEffect(() => {
    const rol = localStorage.getItem("usuario_rol");
    setRolUsuario(rol);
  }, []);

  const handleLogout = () => {
    instance.logoutPopup().catch((e) => console.error("Logout error:", e));
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_email");
    localStorage.removeItem("usuario_nombre");
  };

  const links = [
    { to: "/", label: "Empleados", roles: ["Administrador", "RRHH"] },
    { to: "/clinicas", label: "Clínicas", roles: ["Administrador", "RRHH"] },
    { to: "/estados", label: "Estados", roles: ["Administrador", "RRHH"] },
    { to: "/sso", label: "SSO Microsoft", roles: ["Administrador", "RRHH"] },
    { to: "/selfservice", label: "Self-Service", roles: ["Administrador", "RRHH", "Empleado de planta"],},
    { to: "/logs", label: "Logs de Acciones", roles: ["Administrador"] },
  ];

  if (rolUsuario === null) return null;

  const linksVisibles = links.filter((link) =>
    link.roles.includes(rolUsuario)
  );

  return (
    <aside className="w-64 bg-gray-100 shadow-md p-4 flex flex-col h-screen">
      <div className="mb-6 text-center">
        <img src={logo} alt="Logo" className="mx-auto h-12 mb-2" />
        <h1 className="text-lg font-bold">Gestión Empleados</h1>
      </div>

      <nav className="space-y-2 flex-1">
        {linksVisibles.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="block p-2 rounded hover:bg-blue-200 hover:font-bold text-center"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 text-center">
        {accounts.length > 0 && (
          <>
            <p className="mb-2 font-semibold">Hola, {accounts[0].name}</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

import { Link } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import logo from "../assets/logo.png";

function Sidebar() {
  const { instance, accounts } = useMsal();

  const handleLogout = () => {
    instance.logoutPopup().catch((e) => console.error("Logout error:", e));
  };

  return (
    <aside className="w-64 bg-white shadow-md p-4">
      <div className="mb-6 text-center">
        <img src={logo} alt="Logo" className="mx-auto h-12 mb-2" />
        <h1 className="text-lg font-bold">Gestión Empleados</h1>
      </div>
      <nav className="space-y-2 flex-1">
        <Link to="/" className="block p-2 rounded hover:bg-blue-100 text-center">
          Empleados
        </Link>
        <Link to="/clinicas" className="block p-2 rounded hover:bg-blue-100 text-center">
          Clínicas
        </Link>
        <Link to="/estados" className="block p-2 rounded hover:bg-blue-100 text-center">
          Estados
        </Link>
        <Link to="/sso" className="block p-2 rounded hover:bg-blue-100 text-center">
          SSO Microsoft
        </Link>
        <Link to="/selfservice" className="block p-2 rounded hover:bg-blue-100 text-center"> 
           Self-Service </Link> 
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
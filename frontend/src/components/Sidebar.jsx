import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-md p-4">
      <div className="flex flex-col items-center mb-8">
        <img src={logo} alt="Logo" className="h-50 w-30 mb-1 object-contain" />
        <h2 className="text-3 font-bold text-center">Gestión Empleados</h2>
      </div>
      <nav className="space-y-2">
        <Link to="/" className="block p-2 rounded hover:bg-blue-100 text-center">Empleados</Link>
        <Link to="/clinicas" className="block p-2 rounded hover:bg-blue-100 text-center">Clínicas</Link>
        <Link to="/estados" className="block p-2 rounded hover:bg-blue-100 text-center">Estados</Link>
        <Link to="/sso" className="block p-2 rounded hover:bg-blue-100 text-center">SSO Microsoft</Link>
      </nav>
    </aside>
  );
}

export default Sidebar;

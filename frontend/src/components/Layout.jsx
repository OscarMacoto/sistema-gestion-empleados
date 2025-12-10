import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [rol, setRol] = useState(localStorage.getItem("usuario_rol"));

  useEffect(() => {
    const syncRole = () => {
      setRol(localStorage.getItem("usuario_rol"));
    };

    window.addEventListener("storage", syncRole);
    window.addEventListener("role-updated", syncRole);

    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("role-updated", syncRole);
    };
  }, []);

  return (
    <div className="flex flex-row-reverse">
      {rol && <Sidebar />}
      <main className="flex-1 p-6 bg-gray-50">
        <Header title="Sistema de Gestión" />
        {children}
      </main>
    </div>
  );
}

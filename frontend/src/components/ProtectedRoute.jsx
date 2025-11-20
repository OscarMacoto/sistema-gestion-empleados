import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, rolesPermitidos }) => {
  const rolUsuario = localStorage.getItem("usuario_rol");

  // Si NO hay login MSAL no entra al sistema
  if (!rolUsuario) {
    return <Navigate to="/acceso-denegado" />;
  }

  // Si no se especifican roles acceso libre para usuarios autenticados
  if (!rolesPermitidos) {
    return children;
  }

  // Si el rol NO coincide acceso denegado
  if (!rolesPermitidos.includes(rolUsuario)) {
    return <Navigate to="/acceso-denegado" />;
  }

  return children;
};

export default ProtectedRoute;

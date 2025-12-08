import { Navigate } from "react-router-dom";

/**
  @param {ReactNode} children 
 * @param {Array} rolesPermitidos 
 */
const ProtectedRoute = ({ children, rolesPermitidos }) => {
  const rolUsuario = localStorage.getItem("usuario_rol");

  if (!rolUsuario) {
    return <Navigate to="/acceso-denegado" />;
  }

  if (!rolesPermitidos) {
    return children;
  }

  if (!rolesPermitidos.includes(rolUsuario)) {
    return <Navigate to="/acceso-denegado" />;
  }

  return children;
};

export default ProtectedRoute;

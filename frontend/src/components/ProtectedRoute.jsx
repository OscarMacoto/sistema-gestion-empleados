import { Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
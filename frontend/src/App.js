import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MsalProvider, useIsAuthenticated, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { useState, useEffect } from "react";
import React from "react";
import Logs from "./pages/Logs.jsx";
import Empleados from "./pages/Empleados";
import Clinicas from "./pages/Clinicas";
import Estados from "./pages/Estados";
import SSO from "./pages/SSO";
import SelfService from "./pages/SelfService";
import LoginMicrosoft from "./components/LoginMicrosoft";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <h1 className="text-3xl font-bold text-red-600">
            Ocurrió un error inesperado
          </h1>
          <pre className="mt-4 text-sm text-gray-700">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function AccesoDenegado() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-red-600">Acceso Denegado</h1>
    </div>
  );
}

const msalConfig = {
  auth: {
    clientId: "d317992c-f1f6-4ecf-8bb5-bc4ad085b979",
    authority:
      "https://login.microsoftonline.com/d7d9814e-2d7a-4cf4-b34d-b3ad99396e3f",
    redirectUri: window.location.origin,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

function AppContent() {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const [showWelcome, setShowWelcome] = useState(true);

  const handleLogout = () => {
    instance.logoutPopup({ postLogoutRedirectUri: window.location.origin });
    localStorage.removeItem("usuario_rol");
    window.dispatchEvent(new Event("role-updated"));
  };

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginMicrosoft />;
  }

  if (showWelcome) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <img src="/welcome-image.png" alt="Bienvenido" className="max-w-md" />
      </div>
    );
  }

  return (
    <Layout>
      <button
        onClick={handleLogout}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Cerrar sesión
      </button>

      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute rolesPermitidos={["Administrador", "RRHH"]}>
              <Empleados />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinicas"
          element={
            <ProtectedRoute rolesPermitidos={["Administrador", "RRHH"]}>
              <Clinicas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estados"
          element={
            <ProtectedRoute rolesPermitidos={["Administrador", "RRHH"]}>
              <Estados />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sso"
          element={
            <ProtectedRoute rolesPermitidos={["Administrador", "RRHH"]}>
              <SSO />
            </ProtectedRoute>
          }
        />
        <Route
          path="/selfservice"
          element={
            <ProtectedRoute>
              <SelfService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logs"
          element={
            <ProtectedRoute rolesPermitidos={["Administrador"]}>
              <Logs />
            </ProtectedRoute>
          }
        />
        <Route path="/acceso-denegado" element={<AccesoDenegado />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Router>
    </MsalProvider>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Empleados from "./pages/Empleados";
import Clinicas from "./pages/Clinicas";
import Estados from "./pages/Estados";
import SSO from "./pages/SSO";

function App() {
  return (
    <Router>
      <div className="flex flex-row-reverse">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <Header title="Sistema de Gestión" />
          <Routes>
            <Route path="/" element={<Empleados />} />
            <Route path="/clinicas" element={<Clinicas />} />
            <Route path="/estados" element={<Estados />} />
            <Route path="/sso" element={<SSO />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;


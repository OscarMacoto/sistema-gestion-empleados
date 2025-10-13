/*import { useEffect, useState } from "react";   
function EmployeeTable() { 
  const [empleados, setEmpleados] = useState([]); 
  useEffect(() => { 
    fetch("http://localhost:5000/api/empleados") 
      .then(res => res.json()) 
      .then(data => { 
        console.log("Datos recibidos:", data);
        setEmpleados(data); 
      }) 
      .catch(err => console.error("Error al obtener empleados:", err)); 
  }, []); 

  return ( 
    <div className="p-4"> 
      <h2 className="text-2xl font-bold mb-4">Empleados</h2> 
      <table className="min-w-full border border-gray-300"> 
        <thead> 
          <tr className="bg-gray-200"> 
            <th className="border px-4 py-2">ID</th> 
            <th className="border px-4 py-2">Nombre</th> 
            <th className="border px-4 py-2">Estado</th> 
            <th className="border px-4 py-2">Clínica</th> 
          </tr> 
        </thead> 
        <tbody> 
          {empleados.length === 0 ? ( 
            <tr> 
              <td colSpan="4" className="text-center p-2">No hay empleados</td> 
            </tr> 
          ) : ( 
            empleados.map(emp => ( 
              <tr key={emp.id}> 
                <td className="border px-4 py-2">{emp.id}</td> 
                <td className="border px-4 py-2">{emp.nombre}</td> 
                <td className="border px-4 py-2">{emp.estado}</td> 
                <td className="border px-4 py-2">{emp.clinica}</td> 
              </tr> 
            )) 
          )} 
        </tbody> 
      </table> 
    </div> 
  ); 
} 
export default EmployeeTable;*/
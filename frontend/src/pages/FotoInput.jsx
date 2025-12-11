import React, { useRef } from "react";

const FotoInput = ({ foto, setFoto }) => {
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const limpiarFoto = () => {
    setFoto(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="p-2 border rounded text-sm"
      />

      {foto && (
        <>
          <img
            src={`data:image/jpeg;base64,${foto}`}
            alt="Empleado"
            className="w-24 h-24 rounded-2xl object-cover shadow-md border border-gray-200 mt-2"
          />

          <button
            type="button"
            onClick={limpiarFoto}
            className="mt-2 text-red-500 text-sm underline"
          >
            Quitar foto
          </button>
        </>
      )}
    </div>
  );
};

export default FotoInput;

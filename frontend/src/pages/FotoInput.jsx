import React from "react";

const FotoInput = ({ foto, setFoto }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setFoto(reader.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center">
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="p-2 border rounded text-sm"
      />
      {foto && (
        <img
          src={`data:image/jpeg;base64,${foto}`}
          alt="Empleado"
          className="w-24 h-24 rounded-2xl object-cover shadow-md border border-gray-200 mt-2"
        />
      )}
    </div>
  );
};

export default FotoInput;

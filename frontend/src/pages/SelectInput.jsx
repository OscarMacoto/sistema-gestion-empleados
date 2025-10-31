import React from "react";

const SelectInput = ({ name, value, onChange, options, placeholder }) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    className="p-2 border rounded text-sm w-full"
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option
        key={opt.id ?? opt.id_estado ?? opt.id_clinica}
        value={opt.id ?? opt.id_estado ?? opt.id_clinica}
      >
        {opt.descripcion ?? opt.nombre_clinica ?? opt.nombre}
      </option>
    ))}
  </select>
);

export default SelectInput;

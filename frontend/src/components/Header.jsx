function Header({ title }) {
  return (
    <header className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        + Nuevo
      </button>
    </header>
  );
}

export default Header;

import { useMsal } from "@azure/msal-react";

function LoginMicrosoft() {
  const { instance, accounts } = useMsal();

  const handleLogin = () => {
    instance.loginPopup().catch((e) => console.error(e));
  };

  const handleLogout = () => {
    instance.logoutPopup().catch((e) => console.error(e));
  };

  return (
    <div className="text-center mt-6">
      {accounts.length > 0 ? (
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      ) : (
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Iniciar sesión con Microsoft
        </button>
      )}
    </div>
  );
}

export default LoginMicrosoft;
import { useMsal } from '@azure/msal-react';

const API_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;
const POST_LOGOUT_REDIRECT = window.location.origin;

export function useLogout() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    try {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        console.warn('Logout backend falló; continuo con MSAL:', e?.message || e);
      }

      const accounts = instance.getAllAccounts();
      await instance.logoutRedirect({
        account: accounts[0] || undefined,
        postLogoutRedirectUri: POST_LOGOUT_REDIRECT
      });
    } catch (e) {
      console.error('Logout MSAL falló:', e);
      try {
        const accounts = instance.getAllAccounts();
        for (const acc of accounts) {
          await instance.getTokenCache().removeAccount(acc);
        }
      } catch {}
      window.location.href = POST_LOGOUT_REDIRECT;
    }
  };

  return { handleLogout };
}
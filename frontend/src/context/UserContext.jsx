import React, { createContext, useState, useContext, useEffect } from 'react';
const UserContext = createContext();
const KEY = 'pawSession';
const guest = { name: 'Guest', role: 'guest' };
function stored() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } }
export const UserProvider = ({ children }) => {
  const [session, setSession] = useState(stored);
  const user = session?.user || guest, userId = session?.user?.id || '';
  const login = value => { sessionStorage.setItem(KEY, JSON.stringify(value)); setSession(value); };
  const logout = () => { sessionStorage.removeItem(KEY); setSession(null); };
  useEffect(() => {
    localStorage.removeItem('merchantSession'); localStorage.removeItem('cat_delivery_user_id');
    window.addEventListener('paw-session-expired', logout);
    return () => window.removeEventListener('paw-session-expired', logout);
  }, []);
  return <UserContext.Provider value={{ user, userId, login, loginMerchant: login, logout, merchantToken: user.role === 'merchant' ? session.token : '', isMerchant: user.role === 'merchant' }}>{children}</UserContext.Provider>;
};
export const useUser = () => { const context = useContext(UserContext); if (!context) throw new Error('UserProvider required'); return context; };

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearAccessToken, refreshSession, setAccessToken } from '../lib/api';

const AuthContext = createContext(null);

const guestState = { status: 'ready', user: null };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((payload) => {
        if (active) setState({ status: 'ready', user: payload.user });
      })
      .catch(() => {
        if (active) setState(guestState);
      });

    const onSignedOut = () => {
      clearAccessToken();
      setState(guestState);
    };
    window.addEventListener('paw:signed-out', onSignedOut);
    return () => {
      active = false;
      window.removeEventListener('paw:signed-out', onSignedOut);
    };
  }, []);

  const accept = useCallback((payload) => {
    setAccessToken(payload.accessToken);
    setState({ status: 'ready', user: payload.user });
    return payload.user;
  }, []);

  const loginCustomer = useCallback(
    async (email, password) => {
      const response = await api.post('/api/auth/customer/login', { email, password });
      return accept(response.data.data);
    },
    [accept],
  );

  const registerCustomer = useCallback(
    async (payload) => {
      const response = await api.post('/api/auth/customer/register', payload);
      return accept(response.data.data);
    },
    [accept],
  );

  const loginMerchant = useCallback(
    async (email, password) => {
      const response = await api.post('/api/auth/merchant/login', { email, password });
      return accept(response.data.data);
    },
    [accept],
  );

  const registerMerchant = useCallback(
    async (payload) => {
      const response = await api.post('/api/auth/merchant/register', payload);
      return accept(response.data.data);
    },
    [accept],
  );

  const loginAdmin = useCallback(
    async (email, password) => {
      const response = await api.post('/api/auth/admin/login', { email, password });
      return accept(response.data.data);
    },
    [accept],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Local sign-out still happens if the server is unreachable.
    }
    clearAccessToken();
    setState(guestState);
  }, []);

  const updateUser = useCallback((user) => {
    setState((current) => ({ ...current, user }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isCustomer: state.user?.role === 'customer',
      isMerchant: state.user?.role === 'merchant',
      isAdmin: state.user?.role === 'admin',
      loginCustomer,
      registerCustomer,
      loginMerchant,
      registerMerchant,
      loginAdmin,
      logout,
      updateUser,
    }),
    [state, loginCustomer, registerCustomer, loginMerchant, registerMerchant, loginAdmin, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

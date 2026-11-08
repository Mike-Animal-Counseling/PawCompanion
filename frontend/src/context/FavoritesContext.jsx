import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (user?.role !== 'customer') {
      setIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/api/favorites/ids');
      setIds(new Set(response.data.data));
    } catch {
      // Favorites are a nice-to-have; do not break the page if this fails.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isFavorite = useCallback((animalId) => ids.has(String(animalId)), [ids]);

  const toggle = useCallback(
    async (animalId) => {
      if (user?.role !== 'customer') {
        const error = new Error('Sign in to save companions');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }
      const key = String(animalId);
      const wasFavorite = ids.has(key);
      setIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.delete(key);
        else next.add(key);
        return next;
      });
      try {
        if (wasFavorite) await api.delete(`/api/favorites/${key}`);
        else await api.post(`/api/favorites/${key}`);
      } catch (error) {
        setIds((current) => {
          const next = new Set(current);
          if (wasFavorite) next.add(key);
          else next.delete(key);
          return next;
        });
        toast.error(errorMessage(error, 'Could not update your saved companions'));
      }
    },
    [ids, toast, user],
  );

  const value = useMemo(() => ({ ids, isFavorite, toggle, loading, refresh: load }), [ids, isFavorite, toggle, loading, load]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside FavoritesProvider');
  return context;
}

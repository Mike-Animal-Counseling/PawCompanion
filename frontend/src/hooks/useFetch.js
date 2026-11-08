import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useFetch(url, { enabled = true, initial = null } = {}) {
  const [data, setData] = useState(initial);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(Boolean(url && enabled));
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }
    const id = requestRef.current + 1;
    requestRef.current = id;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(url);
      if (id !== requestRef.current) return;
      setData(response.data.data);
      setMeta(response.data.meta || null);
    } catch (err) {
      if (id === requestRef.current) setError(err);
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  return { data, meta, loading, error, refetch: load, setData };
}

export function useDebouncedValue(value, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useDocumentTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · PawCompanion` : 'PawCompanion · Companionship, on your terms';
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}

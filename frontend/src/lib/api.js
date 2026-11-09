import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || '';
const baseURL = apiUrl.replace(/\/$/, '');

export const api = axios.create({
  ...(baseURL ? { baseURL } : {}),
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/api/auth/refresh`.replace(/^\/\//, '/'), {}, { withCredentials: true, timeout: 20000 })
      .then((response) => {
        const payload = response.data.data;
        setAccessToken(payload.accessToken);
        return payload;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const isAuthPath = String(config?.url || '').startsWith('/api/auth/');
    const shouldRefresh = status === 401 && config && !config._retry && (!isAuthPath || config.url === '/api/auth/me');

    if (shouldRefresh) {
      config._retry = true;
      try {
        await refreshSession();
        config.headers = config.headers || {};
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
      } catch {
        clearAccessToken();
        window.dispatchEvent(new Event('paw:signed-out'));
      }
    }

    return Promise.reject(error);
  },
);

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const payload = error?.response?.data?.error;
  if (typeof payload === 'string') return payload;
  if (payload?.message) return payload.message;
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the API running?';
  return error?.message || fallback;
}

export function fieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  return details && typeof details === 'object' ? details : {};
}

export async function apiGet(url, config) {
  const response = await api.get(url, config);
  return response.data.data;
}

export async function apiPage(url, config) {
  const response = await api.get(url, config);
  return { data: response.data.data, meta: response.data.meta || {} };
}

export async function apiPost(url, body, config) {
  const response = await api.post(url, body, config);
  return response.data.data;
}

export async function apiPatch(url, body) {
  const response = await api.patch(url, body);
  return response.data.data;
}

export async function apiDelete(url) {
  const response = await api.delete(url);
  return response.data?.data;
}

export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const response = await api.post('/api/merchant/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data.data;
}

export async function uploadAnimalSound(animalId, file, { label, mood, behaviour, embedding } = {}) {
  const form = new FormData();
  form.append('audio', file);
  form.append('label', label || '');
  form.append('mood', mood || 'gentle');
  form.append('behaviour', behaviour || '');
  if (embedding?.length) form.append('embedding', JSON.stringify(embedding));
  const response = await api.post(`/api/merchant/animals/${animalId}/sounds`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data.data;
}

export default api;

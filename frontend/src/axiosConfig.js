import axios from "axios";
axios.defaults.baseURL = "/";
axios.interceptors.request.use(config => {
  try { const session = JSON.parse(sessionStorage.getItem("pawSession") || "null"); if (session?.token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${session.token}`; } catch {}
  return config;
});
axios.interceptors.response.use(value => value, error => {
  if (error.response?.status === 401) { sessionStorage.removeItem("pawSession"); window.dispatchEvent(new Event("paw-session-expired")); }
  return Promise.reject(error);
});
export default axios;

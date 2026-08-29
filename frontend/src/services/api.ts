import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/store/authStore";

// Caddy always serves the frontend and proxies /api + /ws on the SAME origin
// the browser is currently using — so the API/WS base is derived from
// window.location at runtime instead of a build-time env var. This makes it
// impossible for the scheme to ever mismatch the page's own origin (which is
// exactly what CSP's connect-src 'self' checks against), regardless of
// whether the browser ended up on http:// or https://.
const sameOriginApiBase = `${window.location.origin}/api`;
const sameOriginWsBase = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || sameOriginApiBase;
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || sameOriginWsBase;

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(api(originalRequest)));
      });
    }

    isRefreshing = true;
    try {
      // Refresh token travels as an HttpOnly cookie — the browser attaches it
      // automatically, nothing to read/send from JS here.
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh/`,
        {},
        { withCredentials: true }
      );
      const current = useAuthStore.getState();
      useAuthStore.setState({ ...current, accessToken: data.access });
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

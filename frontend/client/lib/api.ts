import axios from 'axios';
import { supabase } from './supabase';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Centralized axios client.
 *
 * baseURL is intentionally empty so that existing call-site paths like
 * '/api/feed' resolve to the Vite dev server's own origin. Vite's proxy
 * then intercepts any request starting with '/api' and forwards it to
 * localhost:8000 — no CORS preflight needed.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 10_000,       // fail fast rather than hang
  withCredentials: true, // send cookies if ever needed
});

// Attach Supabase JWT on every request
api.interceptors.request.use(
  (config) => {
    const { session } = useAuthStore.getState();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Optionally handle global errors like 401 unauthorized
    if (error.response?.status === 401) {
      // Force logout if necessary, or emit an event
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

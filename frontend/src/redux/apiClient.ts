import axios from 'axios';
import { signIn, signOut } from './slices/authSlice';

const baseURL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Send httpOnly secure cookies (for refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
});

let store: any;

/**
 * Injects the Redux store dynamically to avoid circular dependencies
 */
export const injectStore = (_store: any) => {
  store = _store;
};

// Request Interceptor: automatically attach the JWT access token from Redux or localStorage
apiClient.interceptors.request.use(
  (config) => {
    let token = store?.getState()?.auth?.accessToken;
    
    // Fallback to localStorage if store is not injected yet
    if (!token) {
      try {
        const raw = localStorage.getItem('agriport_auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed.accessToken;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Queue system for locking concurrent requests while refreshing the token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Response Interceptor: intercept 401s and attempt transparent token rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If request fails with 401 and hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send a request to refresh the token. 
        // withCredentials ensures the httpOnly refreshToken cookie is transmitted.
        const response = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = response.data.data;

        // Save new token in Redux store
        if (store) {
          store.dispatch(signIn({ token: accessToken, user }));
        } else {
          // Fallback manual storage
          try {
            const raw = localStorage.getItem('agriport_auth') || '{}';
            const parsed = JSON.parse(raw);
            parsed.accessToken = accessToken;
            if (user) parsed.user = user;
            parsed.status = 'authenticated';
            localStorage.setItem('agriport_auth', JSON.stringify(parsed));
          } catch {
            // Ignore
          }
        }

        isRefreshing = false;
        processQueue(null, accessToken);

        // Retry original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Sign out user since refresh session has expired
        if (store) {
          store.dispatch(signOut());
        } else {
          localStorage.removeItem('agriport_auth');
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

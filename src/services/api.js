import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",

  withCredentials: true,

  headers: {
    Accept: "application/json",
  },
});

// Keep the access token in memory.
let accessToken = null;

// Store the access token after login or refresh.
export function setAccessToken(token) {
  accessToken = token;
}

// Clear the access token during logout.
export function clearAccessToken() {
  accessToken = null;
}

// Read the CSRF token from the browser cookie.
function getCsrfToken() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("csrf_refresh_token="));

  return cookie
    ? decodeURIComponent(cookie.split("=").slice(1).join("="))
    : null;
}

// Attach the access token to protected API requests.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Prevent multiple requests from refreshing simultaneously.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register") ||
      originalRequest.url?.includes("/api/auth/refresh") ||
      originalRequest.url?.includes("/api/auth/logout")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const csrfToken = getCsrfToken();

          if (!csrfToken) {
            throw new Error("CSRF token is missing.");
          }

          const response = await api.post(
            "/api/auth/refresh",
            {},
            {
              headers: {
                "X-CSRF-TOKEN": csrfToken,
              },
            },
          );

          const newAccessToken = response.data.access_token;

          if (!newAccessToken) {
            throw new Error("Access token was not returned.");
          }

          setAccessToken(newAccessToken);

          return newAccessToken;
        })();
      }

      const newToken = await refreshPromise;

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();

      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

export default api;

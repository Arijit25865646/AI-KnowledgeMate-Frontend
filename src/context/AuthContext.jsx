
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api, {
  setAccessToken,
  clearAccessToken,
} from "../services/api";

import { AuthContext } from "./authContextValue";

// Share one session restoration request across StrictMode effect runs.
let sessionRestorePromise = null;

function restoreUserSession() {
  if (!sessionRestorePromise) {
    sessionRestorePromise = (async () => {
      const csrfToken = getCsrfToken();

      if (!csrfToken) {
        throw new Error("CSRF token is missing.");
      }

      const refreshResponse = await api.post(
        "/api/auth/refresh",
        {},
        {
          headers: {
            "X-CSRF-TOKEN": csrfToken,
          },
        },
      );

      const token = refreshResponse.data.access_token;

      if (!token) {
        throw new Error("Access token was not returned.");
      }

      setAccessToken(token);

      const userResponse = await api.get("/api/auth/me");

      return userResponse.data.user;
    })().finally(() => {
      sessionRestorePromise = null;
    });
  }

  return sessionRestorePromise;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore the user's session when the application starts.
  useEffect(() => {
    let cancelled = false;

    async function initializeAuth() {
      try {
        const restoredUser = await restoreUserSession();

        if (!cancelled) {
          setUser(restoredUser);
        }
      } catch (error) {
        console.error("Session restoration failed:", error);

        if (!cancelled) {
          clearAccessToken();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // Register a new user.
  const register = useCallback(async (name, email, password) => {
    const response = await api.post("/api/auth/register", {
      name,
      email,
      password,
    });

    const { access_token, user: registeredUser } = response.data;

    setAccessToken(access_token);
    setUser(registeredUser);

    return response.data;
  }, []);

  // Login an existing user.
  const login = useCallback(async (email, password) => {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    const { access_token, user: loggedInUser } = response.data;

    setAccessToken(access_token);
    setUser(loggedInUser);

    return response.data;
  }, []);

  // Logout the current user.
  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = {
    user,
    authLoading,
    isAuthenticated: Boolean(user),
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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

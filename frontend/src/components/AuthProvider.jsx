"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { apiRequest } from "@/lib/api";

const AuthContext = createContext(null);

const AUTH_CACHE_KEY = "kaduna_explorer_user";

function getSafeCachedUser() {
  try {
    const cachedUser = sessionStorage.getItem(AUTH_CACHE_KEY);

    if (!cachedUser) return null;

    const parsedUser = JSON.parse(cachedUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object" ||
      Array.isArray(parsedUser)
    ) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }

    return {
      _id: parsedUser._id,
      id: parsedUser.id,
      name: parsedUser.name || "",
      email: parsedUser.email || "",
      photo: parsedUser.photo || "",
      role: parsedUser.role,
    };
  } catch {
    return null;
  }
}

function saveCachedUser(user) {
  try {
    if (!user) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }

    // Cache only information needed to display the profile.
    // Never cache passwords, tokens or authentication credentials.
    const safeUser = {
      _id: user._id,
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      photo: user.photo || "",
      role: user.role,
    };

    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(safeUser));
  } catch {
    // Authentication must continue working even if storage is unavailable.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");

  const authVersion = useRef(0);
  const refreshPromiseRef = useRef(null);

  // Update authentication immediately after login or logout.
  const setAuthenticatedUser = useCallback((nextUser) => {
    authVersion.current += 1;

    // Do not let an older session request overwrite a newer login/logout.
    refreshPromiseRef.current = null;

    const updatedUser = nextUser || null;

    setUser(updatedUser);
    setAuthStatus(updatedUser ? "authenticated" : "unauthenticated");

    saveCachedUser(updatedUser);
  }, []);

  // Check the current user's session.
  // Concurrent calls share one request, including React Strict Mode's
  // development-only effect replay.
  const refreshUser = useCallback(() => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const requestVersion = authVersion.current;

    const requestPromise = (async () => {
      try {
        const response = await apiRequest("/users/me", {
          method: "GET",
        });

        // Ignore requests made before a newer login/logout.
        if (requestVersion !== authVersion.current) {
          return null;
        }

        const currentUser = response?.data?.user || null;

        setUser(currentUser);
        setAuthStatus(currentUser ? "authenticated" : "unauthenticated");

        saveCachedUser(currentUser);

        return currentUser;
      } catch (error) {
        if (requestVersion !== authVersion.current) {
          return null;
        }

        // A rejected session must clear the cached identity.
        if (error?.status === 401 || error?.status === 403) {
          setUser(null);
          setAuthStatus("unauthenticated");
          saveCachedUser(null);

          return null;
        }

        // Network errors and server failures do not prove that the
        // session has expired. Keep the cached profile for the UI.
        // Resolve the initial checking state without discarding that profile.
        setAuthStatus((currentStatus) => {
          if (currentStatus !== "checking") return currentStatus;

          return getSafeCachedUser() ? "authenticated" : "unauthenticated";
        });

        return null;
      } finally {
        if (refreshPromiseRef.current === requestPromise) {
          refreshPromiseRef.current = null;
        }
      }
    })();

    refreshPromiseRef.current = requestPromise;

    return requestPromise;
  }, []);

  // Restore the cached display profile before verifying the session.
  useEffect(() => {
    const cachedUser = getSafeCachedUser();

    if (cachedUser) {
      setUser(cachedUser);
    }

    // Always verify the real session with the backend.
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authStatus,
        setAuthenticatedUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

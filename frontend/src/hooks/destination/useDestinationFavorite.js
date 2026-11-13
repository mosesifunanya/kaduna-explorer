"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

/*
|--------------------------------------------------------------------------
| Shared favourites store
|--------------------------------------------------------------------------
*/

const EMPTY_STORE = {
  user: null,
  favorites: [],
  favoriteIds: [],
  pendingIds: [],
  loading: true,
  initialized: false,
  authStatus: "checking",
  error: "",
};

const SERVER_SNAPSHOT = EMPTY_STORE;

let store = { ...EMPTY_STORE };
let initializationPromise = null;
let authGeneration = 0;

const listeners = new Set();

function publish(nextState) {
  store = nextState;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/*
|--------------------------------------------------------------------------
| Destination ID helpers
|--------------------------------------------------------------------------
*/

function getDestinationId(destination) {
  if (!destination) return null;

  if (typeof destination === "string") {
    return destination;
  }

  if (typeof destination !== "object") {
    return null;
  }

  const id = destination._id || destination.id || null;

  return id ? String(id) : null;
}

function getFavoriteDestinationId(favorite) {
  if (!favorite) return null;

  const destination = favorite.destination;

  if (typeof destination === "string") {
    return destination;
  }

  if (destination && typeof destination === "object") {
    return getDestinationId(destination);
  }

  return null;
}

function normalizeFavorites(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data?.favorites)) {
    return response.data.favorites;
  }

  if (Array.isArray(response?.favorites)) {
    return response.favorites;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

function getFavoriteIds(favorites) {
  return [...new Set(favorites.map(getFavoriteDestinationId).filter(Boolean))];
}

function isAuthenticationError(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("not logged in") ||
    message.includes("not authorized") ||
    message.includes("unauthorized") ||
    message.includes("session is no longer valid") ||
    message.includes("please log in") ||
    message.includes("401")
  );
}

/*
|--------------------------------------------------------------------------
| Load authenticated user's favourites
|--------------------------------------------------------------------------
*/

async function loadFavorites(user, force = false) {
  const userId = user?._id || user?.id || null;

  // Guests never request their private favourites.
  if (!userId) {
    authGeneration += 1;
    initializationPromise = null;

    publish({
      ...store,
      user: null,
      favorites: [],
      favoriteIds: [],
      pendingIds: [],
      loading: false,
      initialized: true,
      authStatus: "unauthenticated",
      error: "",
    });

    return store;
  }

  if (
    !force &&
    store.initialized &&
    store.authStatus === "authenticated" &&
    String(store.user?._id || store.user?.id || "") === String(userId)
  ) {
    return store;
  }

  if (initializationPromise && !force) {
    return initializationPromise;
  }

  // A forced refresh invalidates all older requests.
  const requestGeneration = force ? ++authGeneration : authGeneration;

  publish({
    ...store,
    user,
    loading: true,
    error: "",
    authStatus: "authenticated",
  });

  let requestPromise;

  requestPromise = (async () => {
    try {
      // AuthProvider already verified the session. Only fetch favourites here.
      const favoritesResponse = await apiRequest("favorites");

      if (requestGeneration !== authGeneration) {
        return store;
      }

      const favorites = normalizeFavorites(favoritesResponse);

      publish({
        user,
        favorites,
        favoriteIds: getFavoriteIds(favorites),
        pendingIds: store.pendingIds,
        loading: false,
        initialized: true,
        authStatus: "authenticated",
        error: "",
      });

      return store;
    } catch (error) {
      if (requestGeneration !== authGeneration) {
        return store;
      }

      if (isAuthenticationError(error)) {
        publish({
          ...store,
          user: null,
          favorites: [],
          favoriteIds: [],
          pendingIds: [],
          loading: false,
          initialized: true,
          authStatus: "unauthenticated",
          error: "",
        });
      } else {
        publish({
          ...store,
          loading: false,
          initialized: true,
          authStatus: "error",
          error: error?.message || "Unable to load your saved destinations.",
        });
      }

      return store;
    } finally {
      if (initializationPromise === requestPromise) {
        initializationPromise = null;
      }
    }
  })();

  initializationPromise = requestPromise;

  return requestPromise;
}

/*
|--------------------------------------------------------------------------
| Authentication synchronization
|--------------------------------------------------------------------------
|
| Pass the user from AuthProvider after login/signup. Passing null after
| logout clears the local store without making another authentication request.
|
*/
export function notifyFavoriteAuthChanged(user = null) {
  return loadFavorites(user);
}

/*
|--------------------------------------------------------------------------
| Shared favourite operations
|--------------------------------------------------------------------------
*/

async function updateFavorite(destination, shouldSave) {
  const destinationId = getDestinationId(destination);

  if (!destinationId) {
    publish({
      ...store,
      error: "This destination does not have a valid ID.",
    });

    return false;
  }

  if (store.authStatus !== "authenticated" || !store.user) {
    return false;
  }

  if (store.pendingIds.includes(destinationId)) {
    return false;
  }

  const requestGeneration = authGeneration;

  const alreadySaved = store.favoriteIds.includes(destinationId);

  if (alreadySaved === shouldSave) {
    return true;
  }

  const previousFavorite = store.favorites.find(
    (favorite) => getFavoriteDestinationId(favorite) === destinationId,
  );

  // Prevent repeated clicks while the request is running.
  publish({
    ...store,
    pendingIds: [...store.pendingIds, destinationId],
    error: "",
  });

  // Optimistically update the saved state.
  if (shouldSave) {
    const optimisticFavorite = {
      destination,
    };

    publish({
      ...store,
      favorites: [...store.favorites, optimisticFavorite],
      favoriteIds: [...store.favoriteIds, destinationId],
    });
  } else {
    publish({
      ...store,
      favorites: store.favorites.filter(
        (favorite) => getFavoriteDestinationId(favorite) !== destinationId,
      ),
      favoriteIds: store.favoriteIds.filter((id) => id !== destinationId),
    });
  }

  try {
    if (shouldSave) {
      const response = await apiRequest("favorites", {
        method: "POST",
        body: {
          destination: destinationId,
        },
      });

      if (requestGeneration !== authGeneration) {
        return false;
      }

      const savedFavorite = response?.data?.favorite;

      if (savedFavorite) {
        const normalizedFavorite = {
          ...savedFavorite,
          destination:
            savedFavorite.destination &&
            typeof savedFavorite.destination === "object"
              ? savedFavorite.destination
              : destination,
        };

        publish({
          ...store,
          favorites: [
            ...store.favorites.filter(
              (favorite) =>
                getFavoriteDestinationId(favorite) !== destinationId,
            ),
            normalizedFavorite,
          ],
        });
      }
    } else {
      await apiRequest(`favorites/${encodeURIComponent(destinationId)}`, {
        method: "DELETE",
      });

      if (requestGeneration !== authGeneration) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // Ignore responses belonging to an outdated account session.
    if (requestGeneration !== authGeneration) {
      return false;
    }

    if (shouldSave) {
      publish({
        ...store,
        favorites: store.favorites.filter(
          (favorite) => getFavoriteDestinationId(favorite) !== destinationId,
        ),
        favoriteIds: store.favoriteIds.filter((id) => id !== destinationId),
        error:
          error?.message ||
          "Unable to save this destination. Please try again.",
      });
    } else {
      publish({
        ...store,
        favorites: previousFavorite
          ? [...store.favorites, previousFavorite]
          : store.favorites,
        favoriteIds: previousFavorite
          ? [...new Set([...store.favoriteIds, destinationId])]
          : store.favoriteIds,
        error:
          error?.message ||
          "Unable to remove this destination. Please try again.",
      });
    }

    return false;
  } finally {
    // Do not modify the pending state of a newer account session.
    if (requestGeneration === authGeneration) {
      publish({
        ...store,
        pendingIds: store.pendingIds.filter((id) => id !== destinationId),
      });
    }
  }
}

/*
|--------------------------------------------------------------------------
| React hook
|--------------------------------------------------------------------------
*/

export default function useDestinationFavorite(destination = null) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { user, authStatus } = useAuth();

  const destinationId = getDestinationId(destination);

  useEffect(() => {
    if (authStatus === "checking") return;

    if (authStatus === "authenticated" && user) {
      void loadFavorites(user);
      return;
    }

    void loadFavorites(null);
  }, [authStatus, user]);

  const toggleFavorite = useCallback(async () => {
    if (!destinationId) return false;

    const currentlySaved = store.favoriteIds.includes(destinationId);

    return updateFavorite(destination, !currentlySaved);
  }, [destination, destinationId]);

  const saveFavorite = useCallback(async () => {
    return updateFavorite(destination, true);
  }, [destination]);

  const unsaveFavorite = useCallback(async () => {
    return updateFavorite(destination, false);
  }, [destination]);

  const refreshFavorites = useCallback(async () => {
    return loadFavorites(user, true);
  }, [user]);

  const isFavorite = destinationId
    ? state.favoriteIds.includes(destinationId)
    : false;

  const isPending = destinationId
    ? state.pendingIds.includes(destinationId)
    : false;

  return {
    user,

    isAuthenticated: authStatus === "authenticated",
    authStatus,

    isFavorite,
    isPending,

    isLoading: state.loading,
    loading: state.loading,
    initialized: state.initialized,

    error: state.error,

    favorites: state.favorites,
    favoritesCount: state.favoriteIds.length,

    toggleFavorite,
    saveFavorite,
    unsaveFavorite,
    refreshFavorites,
  };
}

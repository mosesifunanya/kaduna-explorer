"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

/* -------------------------------------------------------------------------- */
/* Shared event favourites store                                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Event ID helpers                                                           */
/* -------------------------------------------------------------------------- */

function getEventId(event) {
  if (!event) return null;

  if (typeof event === "string") {
    return event;
  }

  if (typeof event !== "object") {
    return null;
  }

  const id = event._id || event.id || null;

  return id ? String(id) : null;
}

function getFavoriteEventId(favorite) {
  if (!favorite) return null;

  return getEventId(favorite.event);
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
  return [...new Set(favorites.map(getFavoriteEventId).filter(Boolean))];
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

/* -------------------------------------------------------------------------- */
/* Load authenticated user's event favourites                                */
/* -------------------------------------------------------------------------- */

async function loadEventFavorites(user, force = false) {
  const userId = user?._id || user?.id || null;

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
      // AuthProvider already verified the session.
      const favoritesResponse = await apiRequest("event-favorites");

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
          error: error?.message || "Unable to load your saved events.",
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

/* -------------------------------------------------------------------------- */
/* Authentication synchronization                                            */
/* -------------------------------------------------------------------------- */

// Pass the AuthProvider user after login/signup; pass null after logout.
export function notifyEventFavoriteAuthChanged(user = null) {
  return loadEventFavorites(user);
}

/* -------------------------------------------------------------------------- */
/* Event favourite operations                                                */
/* -------------------------------------------------------------------------- */

async function updateEventFavorite(event, shouldSave) {
  const eventId = getEventId(event);

  if (!eventId) {
    publish({
      ...store,
      error: "This event does not have a valid ID.",
    });

    return false;
  }

  if (store.authStatus !== "authenticated" || !store.user) {
    return false;
  }

  if (store.pendingIds.includes(eventId)) {
    return false;
  }

  const requestGeneration = authGeneration;
  const alreadySaved = store.favoriteIds.includes(eventId);

  if (alreadySaved === shouldSave) {
    return true;
  }

  const previousFavorite = store.favorites.find(
    (favorite) => getFavoriteEventId(favorite) === eventId,
  );

  // Prevent repeated clicks while the request is running.
  publish({
    ...store,
    pendingIds: [...store.pendingIds, eventId],
    error: "",
  });

  // Optimistically update the saved state.
  if (shouldSave) {
    const optimisticFavorite = {
      event,
    };

    publish({
      ...store,
      favorites: [...store.favorites, optimisticFavorite],
      favoriteIds: [...store.favoriteIds, eventId],
    });
  } else {
    publish({
      ...store,
      favorites: store.favorites.filter(
        (favorite) => getFavoriteEventId(favorite) !== eventId,
      ),
      favoriteIds: store.favoriteIds.filter((id) => id !== eventId),
    });
  }

  try {
    if (shouldSave) {
      const response = await apiRequest("event-favorites", {
        method: "POST",
        body: {
          event: eventId,
        },
      });

      if (requestGeneration !== authGeneration) {
        return false;
      }

      const savedFavorite = response?.data?.favorite;

      if (savedFavorite) {
        const normalizedFavorite = {
          ...savedFavorite,
          event:
            savedFavorite.event && typeof savedFavorite.event === "object"
              ? savedFavorite.event
              : event,
        };

        publish({
          ...store,
          favorites: [
            ...store.favorites.filter(
              (favorite) => getFavoriteEventId(favorite) !== eventId,
            ),
            normalizedFavorite,
          ],
        });
      }
    } else {
      await apiRequest(`event-favorites/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
      });

      if (requestGeneration !== authGeneration) {
        return false;
      }
    }

    return true;
  } catch (error) {
    if (requestGeneration !== authGeneration) {
      return false;
    }

    if (shouldSave) {
      publish({
        ...store,
        favorites: store.favorites.filter(
          (favorite) => getFavoriteEventId(favorite) !== eventId,
        ),
        favoriteIds: store.favoriteIds.filter((id) => id !== eventId),
        error: error?.message || "Unable to save this event. Please try again.",
      });
    } else {
      publish({
        ...store,
        favorites: previousFavorite
          ? [...store.favorites, previousFavorite]
          : store.favorites,
        favoriteIds: previousFavorite
          ? [...new Set([...store.favoriteIds, eventId])]
          : store.favoriteIds,
        error:
          error?.message || "Unable to remove this event. Please try again.",
      });
    }

    return false;
  } finally {
    if (requestGeneration === authGeneration) {
      publish({
        ...store,
        pendingIds: store.pendingIds.filter((id) => id !== eventId),
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* React hook                                                                 */
/* -------------------------------------------------------------------------- */

export default function useEventFavorite(event = null) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { user, authStatus } = useAuth();

  const eventId = getEventId(event);

  useEffect(() => {
    if (authStatus === "checking") return;

    if (authStatus === "authenticated" && user) {
      void loadEventFavorites(user);
      return;
    }

    void loadEventFavorites(null);
  }, [authStatus, user]);

  const toggleFavorite = useCallback(async () => {
    if (!eventId) return false;

    const currentlySaved = store.favoriteIds.includes(eventId);

    return updateEventFavorite(event, !currentlySaved);
  }, [event, eventId]);

  const saveFavorite = useCallback(async () => {
    return updateEventFavorite(event, true);
  }, [event]);

  const unsaveFavorite = useCallback(async () => {
    return updateEventFavorite(event, false);
  }, [event]);

  const refreshFavorites = useCallback(async () => {
    return loadEventFavorites(user, true);
  }, [user]);

  const isFavorite = eventId ? state.favoriteIds.includes(eventId) : false;

  const isPending = eventId ? state.pendingIds.includes(eventId) : false;

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

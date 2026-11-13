"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import {
  fetchPublicDestinations,
  getCachedPublicDestinations,
} from "@/lib/publicDestinationCache";
import { normalizeDestination } from "@/lib/destinationUtils";
import { getDestinationCategoryValue } from "@/lib/destinationCategories";

import {
  extractDestination,
  extractDestinations,
  getCoordinates,
  getGallery,
  getIdentifier,
} from "@/lib/destinationDetailsPageUtils";

function findCachedDestination(destinations, identifier) {
  if (!Array.isArray(destinations) || !identifier) return null;

  const normalizedIdentifier = String(identifier).trim().toLowerCase();

  return (
    destinations.find((item) => {
      const values = [item?.slug, item?.id, item?._id]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

      return values.includes(normalizedIdentifier);
    }) || null
  );
}

function getInitialDestination(slug) {
  if (!slug) return null;

  let identifier;

  try {
    identifier = decodeURIComponent(String(slug));
  } catch {
    identifier = String(slug);
  }

  const cachedDestinations = getCachedPublicDestinations();
  const cachedDestination = findCachedDestination(
    cachedDestinations,
    identifier,
  );

  if (!cachedDestination || cachedDestination.isPublished === false) {
    return null;
  }

  return normalizeDestination(cachedDestination, 0);
}

export default function useDestinationDetails(slug) {
  const [destination, setDestination] = useState(() =>
    getInitialDestination(slug),
  );
  const [relatedPool, setRelatedPool] = useState(() => {
    const cachedDestinations = getCachedPublicDestinations();

    return Array.isArray(cachedDestinations)
      ? cachedDestinations
          .filter(
            (item) =>
              item && typeof item === "object" && item.isPublished !== false,
          )
          .map((item, index) => normalizeDestination(item, index))
      : [];
  });
  const [loading, setLoading] = useState(() => !getInitialDestination(slug));
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const loadDestination = useCallback(async () => {
    if (!slug) {
      setDestination(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    let identifier;

    try {
      identifier = decodeURIComponent(String(slug));
    } catch {
      identifier = String(slug);
    }

    const cachedDestination = findCachedDestination(
      getCachedPublicDestinations(),
      identifier,
    );

    if (cachedDestination && cachedDestination.isPublished !== false) {
      setDestination(normalizeDestination(cachedDestination, 0));
      setLoading(false);
    } else {
      setDestination(null);
      setLoading(true);
    }

    setError("");
    setNotFound(false);

    try {
      const response = await apiRequest(
        `destinations/${encodeURIComponent(identifier)}`,
      );

      const item = extractDestination(response);

      if (!item || item.isPublished === false) {
        setDestination(null);
        setNotFound(true);
        return;
      }

      setDestination(normalizeDestination(item, 0));
    } catch (err) {
      const status = Number(
        err?.status || err?.statusCode || err?.response?.status,
      );

      if (status === 404) {
        setDestination(null);
        setNotFound(true);
      } else if (!cachedDestination) {
        console.error("Destination details error:", err);

        setError(
          err?.message ||
            "We could not load this destination. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadRelatedDestinations = useCallback(async () => {
    try {
      const cachedItems = getCachedPublicDestinations();

      if (Array.isArray(cachedItems)) {
        setRelatedPool(
          cachedItems
            .filter(
              (item) =>
                item && typeof item === "object" && item.isPublished !== false,
            )
            .map((item, index) => normalizeDestination(item, index)),
        );
      }

      const items = await fetchPublicDestinations(async () => {
        const response = await apiRequest("destinations");
        const destinations = extractDestinations(response);

        if (!destinations) {
          throw new Error("The destinations response was not recognised.");
        }

        return destinations;
      });

      setRelatedPool(
        items
          .filter(
            (item) =>
              item && typeof item === "object" && item.isPublished !== false,
          )
          .map((item, index) => normalizeDestination(item, index)),
      );
    } catch (err) {
      console.error("Related destinations error:", err);
    }
  }, []);

  useEffect(() => {
    loadDestination();
  }, [loadDestination]);

  useEffect(() => {
    loadRelatedDestinations();
  }, [loadRelatedDestinations]);

  const gallery = useMemo(
    () => (destination ? getGallery(destination) : []),
    [destination],
  );

  const destinationCoordinates = useMemo(
    () => (destination ? getCoordinates(destination) : null),
    [destination],
  );

  const relatedDestinations = useMemo(() => {
    if (!destination) return [];

    const currentId = getIdentifier(destination);
    const currentCategory = getDestinationCategoryValue(destination);

    return relatedPool
      .filter((item) => {
        if (getIdentifier(item) === currentId) return false;
        if (item.isPublished === false) return false;

        return getDestinationCategoryValue(item) === currentCategory;
      })
      .slice(0, 3);
  }, [destination, relatedPool]);

  return {
    destination,
    setDestination,
    relatedPool,
    loading,
    error,
    setError,
    notFound,
    loadDestination,
    loadRelatedDestinations,
    gallery,
    destinationCoordinates,
    relatedDestinations,
  };
}

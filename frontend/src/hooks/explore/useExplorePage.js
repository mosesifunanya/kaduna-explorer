"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  fetchPublicDestinations,
  getCachedPublicDestinations,
} from "@/lib/publicDestinationCache";
import {
  enrichPlacesWithDuckDuckGoImages,
  getPlaceAddress,
  getPlaceName,
  hasPlaceImage,
  preparePlaceForImageLookup,
} from "@/lib/placeImageUtils";
import { normalizeDestination } from "@/lib/destinationUtils";
import {
  DESTINATION_CATEGORIES,
  EXPLORE_CATEGORY_GROUPS,
  getDestinationCategoryLabel,
  getDestinationCategoryValue,
} from "@/lib/destinationCategories";

const ITEMS_PER_PAGE = 8;

const NEARBY_CATEGORIES = [
  "food-dining",
  "accommodation",
  "automotive-services",
  "beauty-personal-care",
  "shopping-retail",
  "swimming-pool",
  "car-wash",
  "mechanic",
  "hair-salon",
  "barbershop",
  "nail-salon",
  "tea-spot",
  "game-centre",
  "sports",
  "lounge",
  "restaurant",
  "hotel",
  "hospital",
  "church",
  "cafe",
  "market",
  "pharmacy",
  "bank",
  "fuel station",
  "tourist attraction",
];

const NEARBY_RADII = [
  { value: "1", label: "Within 1 km" },
  { value: "3", label: "Within 3 km" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" },
];

function extractDestinations(response) {
  const candidates = [
    response?.data?.destinations,
    response?.data?.data?.destinations,
    response?.destinations,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) ?? null;
}

function extractExternalPlaces(response) {
  const candidates = [
    response?.data?.places,
    response?.data?.data?.places,
    response?.places,
  ];

  return candidates.find(Array.isArray) ?? null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function destinationMatchesQuery(destination, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;

  const searchable = [
    destination.name,
    destination.description,
    destination.shortDescription,
    destination.category,
    destination.categoryLabel,
    destination.customCategory,
    destination.address,
    destination.lga,
    destination.city,
    destination.state,
    destination.locationLabel,
    ...(Array.isArray(destination.tags) ? destination.tags : []),
  ];

  return searchable.some(
    (value) =>
      typeof value === "string" &&
      normalizeSearchText(value).includes(normalizedQuery),
  );
}

function destinationCategory(destination) {
  return getDestinationCategoryLabel(destination);
}

function matchesCategory(destination, selectedCategory) {
  if (selectedCategory === "All") return true;

  const categoryValue = getDestinationCategoryValue(destination);

  const group = EXPLORE_CATEGORY_GROUPS.find(
    (item) => item.label === selectedCategory,
  );

  if (group) return group.values.includes(categoryValue);

  return (
    destinationCategory(destination).toLowerCase() ===
    selectedCategory.toLowerCase()
  );
}

function getPlaceCoordinates(place) {
  const latitude =
    place?.latitude ??
    place?.lat ??
    place?.location?.coordinates?.[1] ??
    place?.geometry?.location?.lat ??
    place?.geometry?.location?.latitude;

  const longitude =
    place?.longitude ??
    place?.lon ??
    place?.lng ??
    place?.location?.coordinates?.[0] ??
    place?.geometry?.location?.lng ??
    place?.geometry?.location?.longitude;

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  return { lat, lon };
}

function calculateDistanceMeters(origin, destination) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const latitudeDifference = toRadians(destination.lat - origin.lat);
  const longitudeDifference = toRadians(destination.lon - origin.lon);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function areDuplicateExternalPlaces(left, right) {
  const leftIds = [left?.placeId, left?.id, left?.osmUrl]
    .filter(Boolean)
    .map(String);

  const rightIds = [right?.placeId, right?.id, right?.osmUrl]
    .filter(Boolean)
    .map(String);

  if (leftIds.some((id) => rightIds.includes(id))) return true;

  const leftName = normalizeSearchText(getPlaceName(left));
  const rightName = normalizeSearchText(getPlaceName(right));

  if (!leftName || !rightName) return false;

  const a = getPlaceCoordinates(left);
  const b = getPlaceCoordinates(right);

  if (!a || !b) return leftName === rightName;

  const distance = calculateDistanceMeters(a, b);

  if (distance > 150) return false;
  if (leftName === rightName) return true;

  const leftTokens = new Set(
    leftName.split(/\s+/).filter((word) => word.length > 1),
  );

  const rightTokens = new Set(
    rightName.split(/\s+/).filter((word) => word.length > 1),
  );

  if (!leftTokens.size || !rightTokens.size) return false;

  let shared = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }

  const similarity = (2 * shared) / (leftTokens.size + rightTokens.size);

  return similarity >= 0.86 && distance <= 60;
}

export function useExplorePage() {
  const [initialDestinations] = useState(() => {
    const cachedDestinations = getCachedPublicDestinations();

    return Array.isArray(cachedDestinations)
      ? cachedDestinations
          .filter(
            (destination) =>
              destination &&
              typeof destination === "object" &&
              destination.isPublished !== false,
          )
          .map((destination, index) => normalizeDestination(destination, index))
      : null;
  });

  const [destinations, setDestinations] = useState(
    () => initialDestinations || [],
  );
  const [search, setSearch] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [externalPlaces, setExternalPlaces] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState("");
  const [externalSearched, setExternalSearched] = useState(false);
  const [externalHasMore, setExternalHasMore] = useState(false);
  const [externalLoadingMore, setExternalLoadingMore] = useState(false);

  const imageProvider = "duckduckgo";

  const [destinationPage, setDestinationPage] = useState(1);
  const [officialPage, setOfficialPage] = useState(1);
  const [nearbyPage, setNearbyPage] = useState(1);

  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [nearbyQuery, setNearbyQuery] = useState("");
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState("1");

  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbySearched, setNearbySearched] = useState(false);

  const [visitorLocation, setVisitorLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [showOutsideKadunaModal, setShowOutsideKadunaModal] = useState(false);

  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [showSort, setShowSort] = useState(false);

  const [loading, setLoading] = useState(() => !initialDestinations);
  const [error, setError] = useState("");

  const externalRequestId = useRef(0);
  const externalAbortController = useRef(null);
  const externalLoadMoreAbortController = useRef(null);
  const externalImageAbortController = useRef(null);
  const externalLoadMoreImageAbortController = useRef(null);

  /* Progressive external-search provider sequence. */
  const externalNextProvider = useRef("osm");
  const externalGoogleOffset = useRef(8);

  const nearbyRequestId = useRef(0);
  const gpsRequestId = useRef(0);
  const nearbyAbortController = useRef(null);
  const nearbyImageAbortController = useRef(null);

  const loadDestinations = useCallback(async () => {
    const hasCachedDestinations = Boolean(getCachedPublicDestinations());

    if (!hasCachedDestinations) {
      setLoading(true);
    }

    setError("");

    try {
      const items = await fetchPublicDestinations(async () => {
        const response = await apiRequest("destinations");
        const destinationsResponse = extractDestinations(response);

        if (!destinationsResponse) {
          throw new Error("The destinations response was not recognised.");
        }

        return destinationsResponse;
      });

      const normalized = items
        .filter(
          (destination) =>
            destination &&
            typeof destination === "object" &&
            destination.isPublished !== false,
        )
        .map((destination, index) => normalizeDestination(destination, index));

      setDestinations(normalized);
    } catch (err) {
      setError(err?.message || "Unable to load destinations.");
      console.error("Explore destinations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const categories = useMemo(() => {
    const groupedValues = new Set(
      EXPLORE_CATEGORY_GROUPS.flatMap((group) => group.values),
    );

    const customLabels = destinations
      .filter((destination) => {
        const value = getDestinationCategoryValue(destination);

        return (
          value === "other" ||
          (!groupedValues.has(value) &&
            !DESTINATION_CATEGORIES.some((item) => item.value === value))
        );
      })
      .map(destinationCategory)
      .filter(Boolean);

    const otherBuiltInLabels = destinations
      .filter((destination) => {
        const value = getDestinationCategoryValue(destination);

        return (
          value !== "other" &&
          DESTINATION_CATEGORIES.some((item) => item.value === value) &&
          !groupedValues.has(value)
        );
      })
      .map(destinationCategory)
      .filter(Boolean);

    const extraLabels = [...otherBuiltInLabels, ...customLabels];

    return [
      "All",
      ...EXPLORE_CATEGORY_GROUPS.map((group) => group.label),
      ...Array.from(new Set(extraLabels))
        .filter(
          (label) =>
            !EXPLORE_CATEGORY_GROUPS.some(
              (group) => group.label.toLowerCase() === label.toLowerCase(),
            ),
        )
        .sort((a, b) => a.localeCompare(b)),
    ];
  }, [destinations]);

  const categoryCounts = useMemo(() => {
    const counts = { All: destinations.length };

    categories.forEach((item) => {
      if (item === "All") return;

      counts[item] = destinations.filter((destination) =>
        matchesCategory(destination, item),
      ).length;
    });

    return counts;
  }, [categories, destinations]);

  const filteredDestinations = useMemo(() => {
    const results = destinations.filter(
      (destination) =>
        destinationMatchesQuery(destination, search) &&
        matchesCategory(destination, category),
    );

    return [...results].sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }

      if (sortBy === "newest") {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }

      if (sortBy === "featured") {
        return (
          Number(Boolean(b.isFeatured || b.featured)) -
          Number(Boolean(a.isFeatured || a.featured))
        );
      }

      return (
        Number(Boolean(b.isFeatured || b.featured)) -
          Number(Boolean(a.isFeatured || a.featured)) ||
        Number(a.featuredOrder || 999) - Number(b.featuredOrder || 999)
      );
    });
  }, [destinations, search, category, sortBy]);

  const submittedCmsMatches = useMemo(
    () =>
      submittedQuery
        ? destinations.filter((destination) =>
            destinationMatchesQuery(destination, submittedQuery),
          )
        : [],
    [destinations, submittedQuery],
  );

  const featured = useMemo(
    () =>
      destinations
        .filter(
          (destination) =>
            destination.isFeatured === true || destination.featured === true,
        )
        .sort(
          (a, b) =>
            Number(a.featuredOrder || 999) - Number(b.featuredOrder || 999),
        )
        .slice(0, 3),
    [destinations],
  );

  const paginatedDestinations = useMemo(() => {
    const start = (destinationPage - 1) * ITEMS_PER_PAGE;
    return filteredDestinations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDestinations, destinationPage]);

  const paginatedOfficialMatches = useMemo(() => {
    const start = (officialPage - 1) * ITEMS_PER_PAGE;
    return submittedCmsMatches.slice(start, start + ITEMS_PER_PAGE);
  }, [submittedCmsMatches, officialPage]);

  /* External results are loaded progressively from the backend. */
  const paginatedExternalPlaces = externalPlaces;

  const paginatedNearbyPlaces = useMemo(() => {
    const start = (nearbyPage - 1) * ITEMS_PER_PAGE;
    return nearbyPlaces.slice(start, start + ITEMS_PER_PAGE);
  }, [nearbyPlaces, nearbyPage]);

  useEffect(() => {
    setDestinationPage(1);
  }, [search, category, sortBy]);

  useEffect(() => {
    setOfficialPage(1);
  }, [submittedQuery]);

  const hasFilters =
    Boolean(search.trim()) || category !== "All" || sortBy !== "recommended";

  const handleSearchSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.();

      const query = search.trim();
      const requestId = ++externalRequestId.current;

      externalAbortController.current?.abort();
      externalAbortController.current = null;

      externalLoadMoreAbortController.current?.abort();
      externalLoadMoreAbortController.current = null;

      externalImageAbortController.current?.abort();
      externalImageAbortController.current = null;

      externalLoadMoreImageAbortController.current?.abort();
      externalLoadMoreImageAbortController.current = null;

      nearbyImageAbortController.current?.abort();
      nearbyImageAbortController.current = null;

      nearbyRequestId.current += 1;
      gpsRequestId.current += 1;
      nearbyAbortController.current?.abort();
      nearbyAbortController.current = null;

      setNearbyOpen(false);
      setNearbyPlaces([]);
      setNearbyError("");
      setNearbySearched(false);
      setNearbyLoading(false);
      setLocationLoading(false);
      setNearbyPage(1);

      /* Reset the progressive provider sequence for every new search. */
      externalNextProvider.current = "osm";
      externalGoogleOffset.current = 8;

      setSubmittedQuery(query);
      setExternalPlaces([]);
      setExternalError("");
      setExternalSearched(false);
      setExternalLoading(false);
      setExternalLoadingMore(false);
      setExternalHasMore(false);

      document
        .getElementById("explore-results")
        ?.scrollIntoView({ behavior: "smooth" });

      if (!query) return;

      setExternalLoading(true);

      const controller = new AbortController();
      externalAbortController.current = controller;

      try {
        const response = await apiRequest(
          `destinations/search/places?q=${encodeURIComponent(query)}&provider=google&limit=8`,
          { signal: controller.signal },
        );

        if (
          requestId !== externalRequestId.current ||
          controller.signal.aborted
        ) {
          return;
        }

        const places =
          response?.data?.externalPlaces ||
          response?.data?.places ||
          response?.places;

        if (!Array.isArray(places)) {
          throw new Error("The external places response was not recognised.");
        }

        const validPlaces = places
          .filter((place) => Boolean(getPlaceCoordinates(place)))
          .slice(0, ITEMS_PER_PAGE);

        const placesForDisplay = validPlaces.map(preparePlaceForImageLookup);

        setExternalPlaces(placesForDisplay);

        /* Show more is available only when the initial Google batch is full. */
        setExternalHasMore(validPlaces.length === ITEMS_PER_PAGE);
        setExternalSearched(true);

        if (validPlaces.length) {
          const imageController = new AbortController();
          externalImageAbortController.current = imageController;

          void enrichPlacesWithDuckDuckGoImages(
            validPlaces,
            imageController.signal,
            (targetPlace, image) => {
              const targetId = targetPlace.id || targetPlace.placeId;

              setExternalPlaces((current) =>
                current.map((place) => {
                  const samePlace = targetId
                    ? (place.id || place.placeId) === targetId
                    : place.name === targetPlace.name &&
                      place.latitude === targetPlace.latitude &&
                      place.longitude === targetPlace.longitude;

                  return samePlace
                    ? {
                        ...place,
                        image,
                        imageStatus: "loaded",
                        imageSource: "DuckDuckGo Images",
                      }
                    : place;
                }),
              );
            },
            (targetPlace) => {
              const targetId = targetPlace.id || targetPlace.placeId;

              setExternalPlaces((current) =>
                current.map((place) => {
                  const samePlace = targetId
                    ? (place.id || place.placeId) === targetId
                    : place.name === targetPlace.name &&
                      place.latitude === targetPlace.latitude &&
                      place.longitude === targetPlace.longitude;

                  return samePlace
                    ? { ...place, imageStatus: "unavailable" }
                    : place;
                }),
              );
            },
          ).finally(() => {
            if (externalImageAbortController.current === imageController) {
              externalImageAbortController.current = null;
            }
          });
        }
      } catch (err) {
        if (
          requestId !== externalRequestId.current ||
          controller.signal.aborted
        ) {
          return;
        }

        setExternalError(
          err?.message ||
            "We couldn't search external places right now. Please try again.",
        );

        setExternalSearched(true);
        console.error("Explore external place search:", err);
      } finally {
        if (requestId === externalRequestId.current) {
          setExternalLoading(false);
          externalAbortController.current = null;
        }
      }
    },
    [search],
  );

  const loadMoreExternalPlaces = useCallback(async () => {
    if (
      !submittedQuery ||
      !externalHasMore ||
      externalLoadingMore ||
      externalPlaces.length >= 20
    ) {
      return;
    }

    const requestId = externalRequestId.current;

    externalLoadMoreAbortController.current?.abort();

    const controller = new AbortController();
    externalLoadMoreAbortController.current = controller;

    setExternalError("");
    setExternalLoadingMore(true);

    const getUniquePlaces = (incomingPlaces) => {
      const unique = [];

      for (const place of incomingPlaces || []) {
        if (!getPlaceCoordinates(place)) continue;

        const duplicateInDisplayed = externalPlaces.some((existing) =>
          areDuplicateExternalPlaces(existing, place),
        );

        const duplicateInBatch = unique.some((existing) =>
          areDuplicateExternalPlaces(existing, place),
        );

        if (duplicateInDisplayed || duplicateInBatch) continue;

        if (externalPlaces.length + unique.length >= 20) break;

        unique.push(place);
      }

      return unique;
    };

    const markPlacesForDisplay = (places) =>
      places.map(preparePlaceForImageLookup);

    const startImageEnrichment = (places) => {
      if (!places.length) return;

      const imageController = new AbortController();
      externalLoadMoreImageAbortController.current = imageController;

      void enrichPlacesWithDuckDuckGoImages(
        places,
        imageController.signal,
        (targetPlace, image) => {
          const targetId =
            targetPlace.id || targetPlace.placeId || targetPlace.osmUrl;

          setExternalPlaces((current) =>
            current.map((place) => {
              const samePlace = targetId
                ? [place.id, place.placeId, place.osmUrl]
                    .filter(Boolean)
                    .map(String)
                    .includes(String(targetId))
                : place.name === targetPlace.name &&
                  place.latitude === targetPlace.latitude &&
                  place.longitude === targetPlace.longitude;

              return samePlace
                ? {
                    ...place,
                    image,
                    imageStatus: "loaded",
                    imageSource: "DuckDuckGo Images",
                  }
                : place;
            }),
          );
        },
        (targetPlace) => {
          const targetId =
            targetPlace.id || targetPlace.placeId || targetPlace.osmUrl;

          setExternalPlaces((current) =>
            current.map((place) => {
              const samePlace = targetId
                ? [place.id, place.placeId, place.osmUrl]
                    .filter(Boolean)
                    .map(String)
                    .includes(String(targetId))
                : place.name === targetPlace.name &&
                  place.latitude === targetPlace.latitude &&
                  place.longitude === targetPlace.longitude;

              return samePlace
                ? { ...place, imageStatus: "unavailable" }
                : place;
            }),
          );
        },
      ).finally(() => {
        if (externalLoadMoreImageAbortController.current === imageController) {
          externalLoadMoreImageAbortController.current = null;
        }
      });
    };

    const fetchProviderBatch = async (provider) => {
      const limit = Math.min(8, 20 - externalPlaces.length);

      const params = new URLSearchParams({
        q: submittedQuery,
        provider,
        limit: String(limit),
      });

      if (provider === "google") {
        params.set("offset", String(externalGoogleOffset.current));
      }

      const response = await apiRequest(
        `destinations/search/places?${params.toString()}`,
        { signal: controller.signal },
      );

      if (
        requestId !== externalRequestId.current ||
        controller.signal.aborted
      ) {
        return [];
      }

      const incoming =
        response?.data?.externalPlaces ||
        response?.data?.places ||
        response?.places;

      if (!Array.isArray(incoming)) {
        throw new Error(
          `${provider === "osm" ? "OpenStreetMap" : "Google"} returned an unrecognised places response.`,
        );
      }

      return getUniquePlaces(incoming);
    };

    try {
      let provider = externalNextProvider.current || "osm";
      let uniquePlaces = await fetchProviderBatch(provider);

      if (
        requestId !== externalRequestId.current ||
        controller.signal.aborted
      ) {
        return;
      }

      /* If OSM contributes no new places, use Google immediately on this click. */
      if (provider === "osm" && uniquePlaces.length === 0) {
        provider = "google";
        uniquePlaces = await fetchProviderBatch("google");
      }

      if (
        requestId !== externalRequestId.current ||
        controller.signal.aborted
      ) {
        return;
      }

      if (provider === "google") {
        externalGoogleOffset.current += 8;
      }

      if (uniquePlaces.length > 0) {
        const placesForDisplay = markPlacesForDisplay(uniquePlaces);

        setExternalPlaces((current) => {
          const merged = [...current];

          for (const place of placesForDisplay) {
            if (merged.length >= 20) break;

            if (
              !merged.some((existing) =>
                areDuplicateExternalPlaces(existing, place),
              )
            ) {
              merged.push(place);
            }
          }

          return merged;
        });

        startImageEnrichment(uniquePlaces);
      }

      /* After OSM, subsequent clicks use Google until the 20-place cap. */
      externalNextProvider.current = "google";

      setExternalHasMore(
        uniquePlaces.length > 0 &&
          externalPlaces.length + uniquePlaces.length < 20,
      );
    } catch (err) {
      if (
        requestId === externalRequestId.current &&
        !controller.signal.aborted &&
        err?.name !== "AbortError"
      ) {
        setExternalError(
          err?.message || "More places could not be loaded. Please try again.",
        );
      }
    } finally {
      if (externalLoadMoreAbortController.current === controller) {
        externalLoadMoreAbortController.current = null;
      }

      if (requestId === externalRequestId.current) {
        setExternalLoadingMore(false);
      }
    }
  }, [submittedQuery, externalHasMore, externalLoadingMore, externalPlaces]);

  const cancelNearbySearch = useCallback(() => {
    /* Invalidate both the places request and any pending GPS callback. */
    nearbyRequestId.current += 1;
    gpsRequestId.current += 1;

    if (nearbyAbortController.current) {
      nearbyAbortController.current.abort();
      nearbyAbortController.current = null;
    }

    nearbyImageAbortController.current?.abort();
    nearbyImageAbortController.current = null;

    setNearbyLoading(false);
    setLocationLoading(false);
    setNearbySearched(false);
    setNearbyError("");
    setLocationError("");
  }, []);

  const searchNearbyAt = useCallback(async (origin, query, radiusKm) => {
    const requestId = ++nearbyRequestId.current;
    const cleanQuery = String(query || "").trim();
    const radiusMeters = Math.round(Number(radiusKm) * 1000);

    if (nearbyAbortController.current) {
      nearbyAbortController.current.abort();
    }

    const controller = new AbortController();
    nearbyAbortController.current = controller;

    externalRequestId.current += 1;
    externalAbortController.current?.abort();
    externalAbortController.current = null;

    externalLoadMoreAbortController.current?.abort();
    externalLoadMoreAbortController.current = null;

    externalImageAbortController.current?.abort();
    externalImageAbortController.current = null;

    externalLoadMoreImageAbortController.current?.abort();
    externalLoadMoreImageAbortController.current = null;

    nearbyImageAbortController.current?.abort();
    nearbyImageAbortController.current = null;

    setSubmittedQuery("");
    setExternalPlaces([]);
    setExternalError("");
    setExternalSearched(false);
    setExternalLoading(false);
    setExternalLoadingMore(false);
    setExternalHasMore(false);

    if (
      !origin ||
      !Number.isFinite(origin.lat) ||
      !Number.isFinite(origin.lon)
    ) {
      setNearbyPlaces([]);
      setNearbySearched(false);
      setNearbyError(
        "Your location is unavailable. Please allow location access and try again.",
      );
      setNearbyLoading(false);
      nearbyAbortController.current = null;
      return;
    }

    if (!cleanQuery) {
      setNearbyPlaces([]);
      setNearbySearched(false);
      setNearbyError("Enter a place category, such as restaurant or hospital.");
      setNearbyLoading(false);
      nearbyAbortController.current = null;
      return;
    }

    setNearbyLoading(true);
    setLocationLoading(false);
    setNearbyError("");
    setLocationError("");
    setNearbySearched(true);
    setNearbyPage(1);
    setNearbyPlaces([]);

    try {
      const params = new URLSearchParams({
        q: cleanQuery,
        lat: String(origin.lat),
        lon: String(origin.lon),
        radius: String(radiusMeters),
        limit: "30",
        offset: "0",
      });

      const response = await apiRequest(
        `destinations/search/places?${params.toString()}`,
        { signal: controller.signal },
      );

      if (requestId !== nearbyRequestId.current || controller.signal.aborted) {
        return;
      }

      const places = extractExternalPlaces(response);

      if (!places) {
        throw new Error("The nearby places response was not recognised.");
      }

      const normalized = places
        .map((place) => {
          const coordinates = getPlaceCoordinates(place);

          if (!coordinates) return null;

          const calculatedDistance = calculateDistanceMeters(
            origin,
            coordinates,
          );

          const suppliedDistance = Number(place.distanceMeters);

          return {
            ...place,
            id:
              place.id ||
              place.placeId ||
              place.place_id ||
              `${getPlaceName(place)}-${coordinates.lat}-${coordinates.lon}`,
            name: getPlaceName(place),
            address: getPlaceAddress(place),
            latitude: coordinates.lat,
            longitude: coordinates.lon,
            distanceMeters:
              Number.isFinite(suppliedDistance) && suppliedDistance >= 0
                ? suppliedDistance
                : calculatedDistance,
          };
        })
        .filter(Boolean)
        .filter((place) => place.distanceMeters <= radiusMeters)
        .sort((a, b) => {
          const photoPriority =
            Number(hasPlaceImage(b)) - Number(hasPlaceImage(a));

          return photoPriority || a.distanceMeters - b.distanceMeters;
        });

      if (requestId !== nearbyRequestId.current || controller.signal.aborted) {
        return;
      }

      const nearbyPlacesForDisplay = normalized.map(preparePlaceForImageLookup);

      setNearbyPlaces(nearbyPlacesForDisplay);

      /* Discover nearby-place images through DuckDuckGo. */
      if (nearbyPlacesForDisplay.length > 0) {
        const imageController = new AbortController();
        nearbyImageAbortController.current = imageController;

        void enrichPlacesWithDuckDuckGoImages(
          nearbyPlacesForDisplay,
          imageController.signal,
          (targetPlace, image) => {
            const targetId = targetPlace.id || targetPlace.placeId;

            setNearbyPlaces((current) =>
              current.map((place) => {
                const samePlace = targetId
                  ? (place.id || place.placeId) === targetId
                  : place.name === targetPlace.name &&
                    place.latitude === targetPlace.latitude &&
                    place.longitude === targetPlace.longitude;

                return samePlace
                  ? {
                      ...place,
                      image,
                      imageStatus: "loaded",
                      imageSource: "DuckDuckGo Images",
                    }
                  : place;
              }),
            );
          },
          (targetPlace) => {
            const targetId = targetPlace.id || targetPlace.placeId;

            setNearbyPlaces((current) =>
              current.map((place) => {
                const samePlace = targetId
                  ? (place.id || place.placeId) === targetId
                  : place.name === targetPlace.name &&
                    place.latitude === targetPlace.latitude &&
                    place.longitude === targetPlace.longitude;

                return samePlace
                  ? { ...place, imageStatus: "unavailable" }
                  : place;
              }),
            );
          },
        ).finally(() => {
          if (nearbyImageAbortController.current === imageController) {
            nearbyImageAbortController.current = null;
          }
        });
      }

      if (nearbyPlacesForDisplay.length === 0) {
        setNearbyError(
          `No ${cleanQuery} results were found within ${radiusKm} km. Try a larger radius or another category.`,
        );
      }
    } catch (err) {
      if (
        requestId !== nearbyRequestId.current ||
        controller.signal.aborted ||
        err?.name === "AbortError"
      ) {
        return;
      }

      const errorMessage = String(
        err?.message ||
          err?.response?.data?.message ||
          err?.data?.message ||
          "",
      );

      if (/outside kaduna state/i.test(errorMessage)) {
        gpsRequestId.current += 1;
        setVisitorLocation(null);
        setNearbyPlaces([]);
        setNearbySearched(false);
        setNearbyLoading(false);
        setLocationLoading(false);
        setLocationError("");
        setNearbyError("");
        setShowOutsideKadunaModal(true);
        return;
      }

      setNearbyError(
        errorMessage ||
          "Nearby search is temporarily unavailable. Please try again.",
      );

      console.error("Explore nearby places:", err);
    } finally {
      if (requestId === nearbyRequestId.current) {
        setNearbyLoading(false);
        nearbyAbortController.current = null;
      }
    }
  }, []);

  /* Called only after the visitor explicitly submits the nearby search form. */
  const handleFindNearby = useCallback(
    ({ forceRefresh = false } = {}) => {
      const cleanQuery = nearbyQuery.trim();

      if (!cleanQuery) {
        setNearbyError("Enter a place category before searching.");
        return;
      }

      setNearbyError("");
      setLocationError("");

      if (visitorLocation && !forceRefresh) {
        searchNearbyAt(visitorLocation, cleanQuery, nearbyRadiusKm);
        return;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocationError("Your browser does not support location access.");
        return;
      }

      const gpsRequest = ++gpsRequestId.current;

      setLocationLoading(true);
      setNearbyLoading(true);
      setNearbySearched(false);
      setNearbyPlaces([]);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (gpsRequest !== gpsRequestId.current) return;

          const origin = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          setVisitorLocation(origin);
          setLocationLoading(false);
          setLocationError("");

          searchNearbyAt(origin, cleanQuery, nearbyRadiusKm);
        },
        (geoError) => {
          if (gpsRequest !== gpsRequestId.current) return;

          setLocationLoading(false);
          setNearbyLoading(false);

          setLocationError(
            geoError.code === 1
              ? "Location permission was denied. Allow location access in your browser settings, then try again."
              : geoError.code === 3
                ? "Finding your location took too long. Please try again."
                : "We could not determine your location. Check your device location settings and try again.",
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: forceRefresh ? 0 : 60000,
        },
      );
    },
    [visitorLocation, nearbyQuery, nearbyRadiusKm, searchNearbyAt],
  );

  const handleNearbySubmit = useCallback(
    (event) => {
      event?.preventDefault?.();
      handleFindNearby();
    },
    [handleFindNearby],
  );

  /* Category shortcuts only populate the input; they never start a search. */
  const handleNearbyCategory = useCallback((query) => {
    setNearbyQuery(query);
    setNearbyPage(1);
    setNearbyError("");
  }, []);

  /* Refresh GPS only. The visitor must still press Search nearby to search. */
  const refreshNearbyLocation = useCallback(() => {
    nearbyRequestId.current += 1;
    gpsRequestId.current += 1;

    if (nearbyAbortController.current) {
      nearbyAbortController.current.abort();
      nearbyAbortController.current = null;
    }

    nearbyImageAbortController.current?.abort();
    nearbyImageAbortController.current = null;

    setVisitorLocation(null);
    setNearbyPlaces([]);
    setNearbySearched(false);
    setNearbyLoading(false);
    setNearbyPage(1);
    setNearbyError("");
    setLocationError("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
      return;
    }

    const gpsRequest = ++gpsRequestId.current;

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (gpsRequest !== gpsRequestId.current) return;

        setVisitorLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setLocationLoading(false);
        setLocationError("");
      },
      (geoError) => {
        if (gpsRequest !== gpsRequestId.current) return;

        setLocationLoading(false);

        setLocationError(
          geoError.code === 1
            ? "Location permission was denied. Allow location access in your browser settings, then try again."
            : geoError.code === 3
              ? "Finding your location took too long. Please try again."
              : "We could not determine your location. Check your device location settings and try again.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }, []);

  const toggleNearby = useCallback(() => {
    if (nearbyOpen) {
      cancelNearbySearch();
      setNearbyOpen(false);
      return;
    }

    /* Opening the panel must not request GPS or start a places search. */
    setNearbyOpen(true);
    setNearbyError("");
    setLocationError("");
  }, [nearbyOpen, cancelNearbySearch]);

  const clearSearch = useCallback(() => {
    externalRequestId.current += 1;

    externalAbortController.current?.abort();
    externalAbortController.current = null;

    externalLoadMoreAbortController.current?.abort();
    externalLoadMoreAbortController.current = null;

    externalImageAbortController.current?.abort();
    externalImageAbortController.current = null;

    externalLoadMoreImageAbortController.current?.abort();
    externalLoadMoreImageAbortController.current = null;

    nearbyRequestId.current += 1;
    gpsRequestId.current += 1;

    nearbyAbortController.current?.abort();
    nearbyAbortController.current = null;

    nearbyImageAbortController.current?.abort();
    nearbyImageAbortController.current = null;

    externalNextProvider.current = "osm";
    externalGoogleOffset.current = 8;

    setSearch("");
    setSubmittedQuery("");
    setExternalPlaces([]);
    setExternalError("");
    setExternalSearched(false);
    setExternalLoading(false);
    setExternalLoadingMore(false);
    setExternalHasMore(false);

    setNearbyPlaces([]);
    setNearbyError("");
    setNearbySearched(false);
    setNearbyLoading(false);
    setLocationLoading(false);
    setNearbyPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    externalRequestId.current += 1;

    externalAbortController.current?.abort();
    externalAbortController.current = null;

    externalLoadMoreAbortController.current?.abort();
    externalLoadMoreAbortController.current = null;

    externalImageAbortController.current?.abort();
    externalImageAbortController.current = null;

    externalLoadMoreImageAbortController.current?.abort();
    externalLoadMoreImageAbortController.current = null;

    nearbyRequestId.current += 1;
    gpsRequestId.current += 1;

    nearbyAbortController.current?.abort();
    nearbyAbortController.current = null;

    nearbyImageAbortController.current?.abort();
    nearbyImageAbortController.current = null;

    externalNextProvider.current = "osm";
    externalGoogleOffset.current = 8;

    setSearch("");
    setSubmittedQuery("");
    setExternalPlaces([]);
    setExternalError("");
    setExternalSearched(false);
    setExternalLoading(false);
    setExternalLoadingMore(false);
    setExternalHasMore(false);

    setOfficialPage(1);
    setDestinationPage(1);
    setCategory("All");
    setSortBy("recommended");
    setShowSort(false);

    setNearbyPlaces([]);
    setNearbyError("");
    setNearbySearched(false);
    setNearbyLoading(false);
    setLocationLoading(false);
    setNearbyPage(1);
  }, []);

  const showOfficialSearchResults =
    Boolean(submittedQuery) && submittedCmsMatches.length > 0;

  const showExternalSearchResults = Boolean(submittedQuery) && externalSearched;

  useEffect(() => {
    return () => {
      externalRequestId.current += 1;
      nearbyRequestId.current += 1;
      gpsRequestId.current += 1;

      externalAbortController.current?.abort();
      externalLoadMoreAbortController.current?.abort();
      externalImageAbortController.current?.abort();
      externalLoadMoreImageAbortController.current?.abort();
      nearbyAbortController.current?.abort();
      nearbyImageAbortController.current?.abort();
    };
  }, []);

  return {
    destinations,
    featured,
    search,
    setSearch,
    clearSearch,
    submittedQuery,
    handleSearchSubmit,
    categories,
    categoryCounts,
    category,
    setCategory,
    sortBy,
    setSortBy,
    showSort,
    setShowSort,
    hasFilters,
    resetFilters,
    filteredDestinations,
    paginatedDestinations,
    destinationPage,
    setDestinationPage,
    submittedCmsMatches,
    paginatedOfficialMatches,
    officialPage,
    setOfficialPage,
    showOfficialSearchResults,
    externalPlaces,
    paginatedExternalPlaces,
    externalLoading,
    externalError,
    externalSearched,
    externalHasMore,
    externalLoadingMore,
    loadMoreExternalPlaces,
    imageProvider,
    showExternalSearchResults,
    nearbyOpen,
    toggleNearby,
    nearbyQuery,
    setNearbyQuery,
    nearbyRadiusKm,
    setNearbyRadiusKm,
    nearbyCategories: NEARBY_CATEGORIES,
    nearbyRadii: NEARBY_RADII,
    nearbyPlaces,
    paginatedNearbyPlaces,
    nearbyLoading,
    nearbyError,
    nearbySearched,
    nearbyPage,
    setNearbyPage,
    handleFindNearby,
    handleNearbySubmit,
    handleNearbyCategory,
    cancelNearbySearch,
    refreshNearbyLocation,
    visitorLocation,
    locationLoading,
    locationError,
    loading,
    error,
    loadDestinations,
    showOutsideKadunaModal,
    closeOutsideKadunaModal: () => setShowOutsideKadunaModal(false),
  };
}

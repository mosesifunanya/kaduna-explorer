"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiRequest } from "@/lib/api";

import {
  enrichPlacesWithDuckDuckGoImages,
  getPlaceAddress,
  getPlaceName,
  preparePlaceForImageLookup,
} from "@/lib/placeImageUtils";

import {
  deduplicateNearbyPlaces,
  distanceInMeters,
  extractPlaces,
  isFamilyFriendlyPlace,
} from "@/lib/destinationDetailsPageUtils";

const BATCH_SIZE = 8;
const MAX_RESULTS = 20;

function getCoordinates(value) {
  if (!value) return null;

  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lon ?? value.lng);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function getDestinationCoordinates(destinationCoordinates, destination) {
  const coordinates = getCoordinates(destinationCoordinates);

  if (coordinates) return coordinates;

  const latitude =
    destination?.location?.coordinates?.[1] ??
    destination?.latitude ??
    destination?.lat;

  const longitude =
    destination?.location?.coordinates?.[0] ??
    destination?.longitude ??
    destination?.lon ??
    destination?.lng;

  return getCoordinates({ latitude, longitude });
}

function getPagination(response) {
  return response?.pagination || response?.data?.pagination || {};
}

function isSamePlace(left, right) {
  const leftIds = [
    left?.id,
    left?._id,
    left?.placeId,
    left?.place_id,
    left?.osmId,
    left?.osmUrl,
  ]
    .filter(Boolean)
    .map(String);

  const rightIds = [
    right?.id,
    right?._id,
    right?.placeId,
    right?.place_id,
    right?.osmId,
    right?.osmUrl,
  ]
    .filter(Boolean)
    .map(String);

  if (leftIds.some((id) => rightIds.includes(id))) {
    return true;
  }

  const leftName = String(getPlaceName(left) || "")
    .trim()
    .toLowerCase();

  const rightName = String(getPlaceName(right) || "")
    .trim()
    .toLowerCase();

  const leftCoordinates = getCoordinates(left);
  const rightCoordinates = getCoordinates(right);

  if (!leftCoordinates || !rightCoordinates) {
    return false;
  }

  if (!leftName || leftName !== rightName) {
    return false;
  }

  return distanceInMeters(leftCoordinates, rightCoordinates) <= 100;
}

function updatePlaceImage(places, targetPlace, image, unavailable = false) {
  if (!Array.isArray(places)) return places;

  return places.map((place) => {
    if (!isSamePlace(place, targetPlace)) return place;

    if (unavailable) {
      return {
        ...place,
        image: null,
        imageStatus: "unavailable",
        imageSource: null,
      };
    }

    return {
      ...place,
      image,
      imageStatus: "loaded",
      imageSource: "DuckDuckGo Images",
    };
  });
}

function getUniquePlaces(incomingPlaces, existingPlaces, destination) {
  const unique = [];

  for (const place of incomingPlaces || []) {
    const coordinates = getCoordinates(place);

    if (!coordinates) continue;

    const duplicate =
      existingPlaces.some((existing) => isSamePlace(existing, place)) ||
      unique.some((existing) => isSamePlace(existing, place));

    if (!duplicate) {
      unique.push({
        ...place,
        ...coordinates,
      });
    }
  }

  return deduplicateNearbyPlaces(unique, destination);
}

export default function useDestinationNearbySearch({
  destination,
  destinationCoordinates,
  slug,
  gpsEnabled,
  visitorLocation,
  setGpsEnabled,
  setVisitorLocation,
  setLocationError,
  setShowOutsideKadunaModal,
}) {
  const [nearbyQuery, setNearbyQuery] = useState("restaurants");

  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbySearched, setNearbySearched] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState(1);
  const [nearbyPage, setNearbyPage] = useState(1);

  const [gpsPlaces, setGpsPlaces] = useState([]);
  const [gpsPlacesLoading, setGpsPlacesLoading] = useState(false);
  const [gpsPlacesError, setGpsPlacesError] = useState("");
  const [gpsPlacesSearched, setGpsPlacesSearched] = useState(false);
  const [gpsPage, setGpsPage] = useState(1);

  const [nearbyHasMore, setNearbyHasMore] = useState(false);
  const [gpsHasMore, setGpsHasMore] = useState(false);

  const [nearbyLoadingMore, setNearbyLoadingMore] = useState(false);
  const [gpsLoadingMore, setGpsLoadingMore] = useState(false);

  const nearbyRequestId = useRef(0);
  const gpsRequestId = useRef(0);

  const nearbyNextProvider = useRef(null);
  const gpsNextProvider = useRef(null);

  const nearbyAbortController = useRef(null);
  const gpsAbortController = useRef(null);

  const nearbyImageAbortController = useRef(null);
  const gpsImageAbortController = useRef(null);

  const abortController = useCallback((controllerRef) => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  const abortAllRequests = useCallback(() => {
    abortController(nearbyAbortController);
    abortController(gpsAbortController);
    abortController(nearbyImageAbortController);
    abortController(gpsImageAbortController);
  }, [abortController]);

  const cancelNearbySearch = useCallback(() => {
    nearbyRequestId.current += 1;
    gpsRequestId.current += 1;

    abortAllRequests();

    setNearbyLoading(false);
    setGpsPlacesLoading(false);
    setNearbyLoadingMore(false);
    setGpsLoadingMore(false);
  }, [abortAllRequests]);

  const resetNearbySearch = useCallback(() => {
    cancelNearbySearch();

    setNearbyQuery("restaurants");

    setNearbyPlaces([]);
    setNearbyLoading(false);
    setNearbyError("");
    setNearbySearched(false);
    setNearbyPage(1);
    setNearbyHasMore(false);
    setNearbyLoadingMore(false);
    nearbyNextProvider.current = null;

    setGpsPlaces([]);
    setGpsPlacesLoading(false);
    setGpsPlacesError("");
    setGpsPlacesSearched(false);
    setGpsPage(1);
    setGpsHasMore(false);
    setGpsLoadingMore(false);
    gpsNextProvider.current = null;
  }, [cancelNearbySearch]);

  useEffect(() => {
    resetNearbySearch();
  }, [slug, resetNearbySearch]);

  useEffect(() => {
    return () => {
      nearbyRequestId.current += 1;
      gpsRequestId.current += 1;
      abortAllRequests();
    };
  }, [abortAllRequests]);

  const buildSearchParams = useCallback(
    (query, origin, provider) => {
      const params = new URLSearchParams({
        q: query,
        lat: String(origin.latitude),
        lon: String(origin.longitude),
        radius: String(searchRadiusKm * 1000),
        limit: String(BATCH_SIZE),
        offset: "0",
        provider,
      });

      const destinationId = String(
        destination?._id || destination?.id || "",
      ).trim();

      const destinationSlug = String(destination?.slug || slug || "").trim();

      if (destinationId) {
        params.set("excludeDestinationId", destinationId);
      }

      if (destinationSlug) {
        params.set("excludeDestinationSlug", destinationSlug);
      }

      return params;
    },
    [destination, slug, searchRadiusKm],
  );

  const enrichImages = useCallback(
    (places, mode, requestId) => {
      if (!places.length) return;

      const isGps = mode === "gps";

      const controllerRef = isGps
        ? gpsImageAbortController
        : nearbyImageAbortController;

      const requestRef = isGps ? gpsRequestId : nearbyRequestId;

      const setPlaces = isGps ? setGpsPlaces : setNearbyPlaces;

      abortController(controllerRef);

      const controller = new AbortController();
      controllerRef.current = controller;

      void enrichPlacesWithDuckDuckGoImages(
        places,
        controller.signal,
        (targetPlace, image) => {
          if (controller.signal.aborted || requestId !== requestRef.current) {
            return;
          }

          setPlaces((current) => updatePlaceImage(current, targetPlace, image));
        },
        (targetPlace) => {
          if (controller.signal.aborted || requestId !== requestRef.current) {
            return;
          }

          setPlaces((current) =>
            updatePlaceImage(current, targetPlace, null, true),
          );
        },
      ).finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      });
    },
    [abortController],
  );

  const handleOutsideKaduna = useCallback(() => {
    setGpsEnabled(false);
    setVisitorLocation(null);

    setGpsPlaces([]);
    setGpsPlacesError("");
    setGpsPlacesSearched(false);
    setGpsPlacesLoading(false);
    setGpsHasMore(false);
    setGpsLoadingMore(false);

    gpsNextProvider.current = null;

    setLocationError("");
    setShowOutsideKadunaModal(true);
  }, [
    setGpsEnabled,
    setVisitorLocation,
    setLocationError,
    setShowOutsideKadunaModal,
  ]);

  const searchPlacesAtOrigin = useCallback(
    async (queryValue, originValue, mode, requestId) => {
      const query = String(queryValue || "").trim();
      const origin = getCoordinates(originValue);
      const isGps = mode === "gps";

      const requestRef = isGps ? gpsRequestId : nearbyRequestId;

      const controllerRef = isGps ? gpsAbortController : nearbyAbortController;

      const stillCurrent = () => requestId === requestRef.current;

      const setModeError = (message) => {
        if (isGps) {
          setGpsPlacesError(message);
          setGpsPlacesSearched(true);
        } else {
          setNearbyError(message);
          setNearbySearched(true);
        }
      };

      if (query.length < 2) {
        setModeError("Enter at least 2 characters to search.");
        return;
      }

      if (!origin) {
        setModeError(
          isGps
            ? "Your current location is unavailable. Turn GPS on and try again."
            : "This destination does not have valid saved coordinates yet.",
        );
        return;
      }

      abortController(controllerRef);

      const controller = new AbortController();
      controllerRef.current = controller;

      if (isGps) {
        setGpsPlaces([]);
        setGpsPlacesLoading(true);
        setGpsPlacesError("");
        setGpsPlacesSearched(false);
        setGpsHasMore(false);
        setGpsLoadingMore(false);
        setGpsPage(1);
        gpsNextProvider.current = null;
      } else {
        setNearbyPlaces([]);
        setNearbyLoading(true);
        setNearbyError("");
        setNearbySearched(false);
        setNearbyHasMore(false);
        setNearbyLoadingMore(false);
        setNearbyPage(1);
        nearbyNextProvider.current = null;
      }

      try {
        const params = buildSearchParams(query, origin, "google");

        const response = await apiRequest(
          `destinations/search/places?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!stillCurrent() || controller.signal.aborted) return;

        const extractedPlaces = extractPlaces(response);

        if (!Array.isArray(extractedPlaces)) {
          throw new Error("The nearby places response was not recognised.");
        }

        const radiusMeters = searchRadiusKm * 1000;

        const places = extractedPlaces
          .filter(isFamilyFriendlyPlace)
          .map((place) => {
            const coordinates = getCoordinates(place);

            if (!coordinates) return null;

            return {
              ...place,
              ...coordinates,
              name: getPlaceName(place),
              address: getPlaceAddress(place),
              distanceMeters: distanceInMeters(origin, coordinates),
            };
          })
          .filter(Boolean)
          .filter(
            (place) =>
              Number.isFinite(place.distanceMeters) &&
              place.distanceMeters <= radiusMeters,
          )
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        const uniquePlaces = deduplicateNearbyPlaces(places, destination).slice(
          0,
          MAX_RESULTS,
        );

        const pagination = getPagination(response);
        const nextProvider = pagination.nextProvider || null;
        const hasMore = Boolean(pagination.hasMore && nextProvider);

        const displayPlaces = uniquePlaces.map(preparePlaceForImageLookup);

        if (isGps) {
          setGpsPlaces(displayPlaces);
          setGpsPlacesSearched(true);
          setGpsHasMore(hasMore);
          gpsNextProvider.current = nextProvider;
        } else {
          setNearbyPlaces(displayPlaces);
          setNearbySearched(true);
          setNearbyHasMore(hasMore);
          nearbyNextProvider.current = nextProvider;
        }

        enrichImages(displayPlaces, mode, requestId);
      } catch (error) {
        if (
          !stillCurrent() ||
          controller.signal.aborted ||
          error?.name === "AbortError"
        ) {
          return;
        }

        console.error("Nearby place search error:", error);

        if (isGps && /outside kaduna state/i.test(error?.message || "")) {
          handleOutsideKaduna();
          return;
        }

        setModeError(
          error?.message ||
            "We couldn't retrieve nearby places. Please try again.",
        );
      } finally {
        if (stillCurrent()) {
          if (isGps) {
            setGpsPlacesLoading(false);
          } else {
            setNearbyLoading(false);
          }

          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
        }
      }
    },
    [
      destination,
      searchRadiusKm,
      buildSearchParams,
      abortController,
      enrichImages,
      handleOutsideKaduna,
    ],
  );

  const loadMorePlaces = useCallback(
    async (mode) => {
      const isGps = mode === "gps";

      const requestRef = isGps ? gpsRequestId : nearbyRequestId;

      const requestId = requestRef.current;

      const stillCurrent = () => requestId === requestRef.current;

      const currentPlaces = isGps ? gpsPlaces : nearbyPlaces;
      const hasMore = isGps ? gpsHasMore : nearbyHasMore;
      const loadingMore = isGps ? gpsLoadingMore : nearbyLoadingMore;

      const nextProvider = isGps
        ? gpsNextProvider.current
        : nearbyNextProvider.current;

      if (
        !hasMore ||
        loadingMore ||
        !nextProvider ||
        currentPlaces.length >= MAX_RESULTS
      ) {
        return;
      }

      const originValue = isGps
        ? visitorLocation
        : getDestinationCoordinates(destinationCoordinates, destination);

      const origin = getCoordinates(originValue);

      if (!origin) return;

      const controllerRef = isGps ? gpsAbortController : nearbyAbortController;

      abortController(controllerRef);

      const controller = new AbortController();
      controllerRef.current = controller;

      if (isGps) {
        setGpsLoadingMore(true);
        setGpsPlacesError("");
      } else {
        setNearbyLoadingMore(true);
        setNearbyError("");
      }

      try {
        const params = buildSearchParams(nearbyQuery, origin, nextProvider);

        const response = await apiRequest(
          `destinations/search/places?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!stillCurrent() || controller.signal.aborted) return;

        const extractedPlaces = extractPlaces(response);

        if (!Array.isArray(extractedPlaces)) {
          throw new Error("The nearby places response was not recognised.");
        }

        const incomingPlaces = extractedPlaces
          .filter(isFamilyFriendlyPlace)
          .map((place) => {
            const coordinates = getCoordinates(place);

            if (!coordinates) return null;

            return {
              ...place,
              ...coordinates,
              name: getPlaceName(place),
              address: getPlaceAddress(place),
              distanceMeters: distanceInMeters(origin, coordinates),
            };
          })
          .filter(Boolean)
          .filter(
            (place) =>
              Number.isFinite(place.distanceMeters) &&
              place.distanceMeters <= searchRadiusKm * 1000,
          )
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        const uniqueIncoming = getUniquePlaces(
          incomingPlaces,
          currentPlaces,
          destination,
        );

        const remaining = Math.max(0, MAX_RESULTS - currentPlaces.length);

        const nextBatch = uniqueIncoming
          .slice(0, Math.min(BATCH_SIZE, remaining))
          .map(preparePlaceForImageLookup);

        const combinedPlaces = [...currentPlaces, ...nextBatch];

        const pagination = getPagination(response);
        let nextProviderValue = pagination.nextProvider || null;
        let hasMoreValue = Boolean(pagination.hasMore && nextProviderValue);

        if (combinedPlaces.length >= MAX_RESULTS) {
          nextProviderValue = null;
          hasMoreValue = false;
        }

        if (isGps) {
          setGpsPlaces(combinedPlaces);
          setGpsHasMore(hasMoreValue);
          gpsNextProvider.current = nextProviderValue;
        } else {
          setNearbyPlaces(combinedPlaces);
          setNearbyHasMore(hasMoreValue);
          nearbyNextProvider.current = nextProviderValue;
        }

        enrichImages(nextBatch, mode, requestId);
      } catch (error) {
        if (
          !stillCurrent() ||
          controller.signal.aborted ||
          error?.name === "AbortError"
        ) {
          return;
        }

        console.error("Nearby places Show more error:", error);

        if (isGps && /outside kaduna state/i.test(error?.message || "")) {
          handleOutsideKaduna();
          return;
        }

        if (isGps) {
          setGpsPlacesError(
            error?.message || "We couldn't load more nearby places.",
          );
        } else {
          setNearbyError(
            error?.message || "We couldn't load more nearby places.",
          );
        }
      } finally {
        if (stillCurrent()) {
          if (isGps) {
            setGpsLoadingMore(false);
          } else {
            setNearbyLoadingMore(false);
          }

          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
        }
      }
    },
    [
      gpsPlaces,
      nearbyPlaces,
      gpsHasMore,
      nearbyHasMore,
      gpsLoadingMore,
      nearbyLoadingMore,
      visitorLocation,
      destinationCoordinates,
      destination,
      nearbyQuery,
      searchRadiusKm,
      buildSearchParams,
      abortController,
      enrichImages,
      handleOutsideKaduna,
    ],
  );

  const showMoreNearbyPlaces = useCallback(() => {
    return loadMorePlaces("destination");
  }, [loadMorePlaces]);

  const showMoreGpsPlaces = useCallback(() => {
    return loadMorePlaces("gps");
  }, [loadMorePlaces]);

  const searchNearbyPlaces = useCallback(
    async (event) => {
      if (event) event.preventDefault();

      const useGps = Boolean(gpsEnabled && visitorLocation);

      const origin = useGps
        ? visitorLocation
        : getDestinationCoordinates(destinationCoordinates, destination);

      const mode = useGps ? "gps" : "destination";

      if (!getCoordinates(origin)) {
        setNearbyError(
          "This destination does not have valid saved coordinates yet.",
        );
        setNearbySearched(true);
        return;
      }

      if (useGps) {
        const requestId = ++gpsRequestId.current;
        nearbyRequestId.current += 1;

        abortController(nearbyAbortController);
        abortController(nearbyImageAbortController);

        setNearbyPlaces([]);
        setNearbyError("");
        setNearbySearched(false);
        setNearbyLoading(false);
        setNearbyHasMore(false);
        nearbyNextProvider.current = null;

        await searchPlacesAtOrigin(nearbyQuery, origin, mode, requestId);
      } else {
        const requestId = ++nearbyRequestId.current;
        gpsRequestId.current += 1;

        abortController(gpsAbortController);
        abortController(gpsImageAbortController);

        setGpsPlaces([]);
        setGpsPlacesError("");
        setGpsPlacesSearched(false);
        setGpsPlacesLoading(false);
        setGpsHasMore(false);
        gpsNextProvider.current = null;

        await searchPlacesAtOrigin(nearbyQuery, origin, mode, requestId);
      }
    },
    [
      gpsEnabled,
      visitorLocation,
      destinationCoordinates,
      destination,
      nearbyQuery,
      searchPlacesAtOrigin,
      abortController,
    ],
  );

  const handleSearchRadiusChange = useCallback(
    (nextRadiusKm) => {
      const radiusKm = Number(nextRadiusKm);

      if (![1, 3, 5, 10, 25].includes(radiusKm)) return;

      cancelNearbySearch();

      setSearchRadiusKm(radiusKm);

      setNearbyPlaces([]);
      setNearbyError("");
      setNearbySearched(false);
      setNearbyHasMore(false);
      setNearbyLoadingMore(false);
      nearbyNextProvider.current = null;

      setGpsPlaces([]);
      setGpsPlacesError("");
      setGpsPlacesSearched(false);
      setGpsHasMore(false);
      setGpsLoadingMore(false);
      gpsNextProvider.current = null;

      setNearbyPage(1);
      setGpsPage(1);
    },
    [cancelNearbySearch],
  );

  const handleLocationEnabled = useCallback(() => {
    cancelNearbySearch();

    setNearbyPlaces([]);
    setNearbyError("");
    setNearbySearched(false);
    setNearbyHasMore(false);
    nearbyNextProvider.current = null;

    setGpsPlaces([]);
    setGpsPlacesError("");
    setGpsPlacesSearched(false);
    setGpsHasMore(false);
    gpsNextProvider.current = null;
  }, [cancelNearbySearch]);

  const handleLocationDisabled = useCallback(() => {
    cancelNearbySearch();

    setNearbyPlaces([]);
    setNearbyError("");
    setNearbySearched(false);
    setNearbyHasMore(false);
    nearbyNextProvider.current = null;

    setGpsPlaces([]);
    setGpsPlacesError("");
    setGpsPlacesSearched(false);
    setGpsHasMore(false);
    gpsNextProvider.current = null;

    setNearbyPage(1);
    setGpsPage(1);
  }, [cancelNearbySearch]);

  return {
    nearbyQuery,
    setNearbyQuery,
    nearbyPlaces,
    setNearbyPlaces,
    nearbyLoading,
    nearbyError,
    setNearbyError,
    nearbySearched,
    setNearbySearched,
    searchRadiusKm,
    nearbyPage,
    setNearbyPage,

    nearbyHasMore,
    nearbyLoadingMore,
    showMoreNearbyPlaces,

    gpsPlaces,
    setGpsPlaces,
    gpsPlacesLoading,
    gpsPlacesError,
    setGpsPlacesError,
    gpsPlacesSearched,
    setGpsPlacesSearched,
    gpsPage,
    setGpsPage,

    gpsHasMore,
    gpsLoadingMore,
    showMoreGpsPlaces,

    nearbyRequestId,
    gpsRequestId,

    cancelNearbySearch,
    resetNearbySearch,
    searchPlacesAtOrigin,
    searchNearbyPlaces,
    handleSearchRadiusChange,
    handleLocationEnabled,
    handleLocationDisabled,
  };
}

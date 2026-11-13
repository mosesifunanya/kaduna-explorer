"use strict";

const AppError = require("../utils/appError");

const NOMINATIM_URL =
  process.env.OSM_NOMINATIM_URL || "https://nominatim.openstreetmap.org/search";

const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";

const OVERPASS_URL =
  process.env.OSM_OVERPASS_URL || "https://overpass-api.de/api/interpreter";

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const GOOGLE_PLACES_NEARBY_URL =
  "https://places.googleapis.com/v1/places:searchNearby";

const GOOGLE_PLACES_TEXT_URL =
  "https://places.googleapis.com/v1/places:searchText";

const REQUEST_TIMEOUT_MS = 30000;

const DEFAULT_RESULTS_LIMIT = 30;
const MAX_RESULTS_LIMIT = 500;
const MIN_QUERY_LENGTH = 2;

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

const MAX_CONCURRENT_REQUESTS = 3;

const DEFAULT_RADIUS_METERS = 5000;
const MAX_RADIUS_METERS = 25000;

const KADUNA_BOUNDS = {
  south: 9.0,
  west: 7.0,
  north: 11.5,
  east: 9.5,
};

const USER_AGENT =
  process.env.OSM_USER_AGENT || "KadunaExplorer/1.0 (tourism place discovery)";

const cache = new Map();

let activeRequests = 0;

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function getCached(key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  // Refresh insertion order so frequently used entries remain in the cache.
  cache.delete(key);
  cache.set(key, entry);

  return entry.value;
}

function setCached(key, value) {
  // Replace an existing entry before inserting its updated value.
  cache.delete(key);

  // Evict the oldest entry when the cache reaches its capacity.
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey === undefined) {
      break;
    }

    cache.delete(oldestKey);
  }

  cache.set(key, {
    createdAt: Date.now(),
    value,
  });
}

async function fetchJson(url, options = {}) {
  const {
    timeoutMs = REQUEST_TIMEOUT_MS,
    signal: externalSignal,
    ...requestOptions
  } = options;

  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    throw new AppError("Place search is busy. Please try again shortly.", 503);
  }

  // Do not start an external request that has already been cancelled.
  if (externalSignal?.aborted) {
    const error = new Error("The request was cancelled.");
    error.name = "AbortError";
    throw error;
  }

  activeRequests += 1;

  const controller = new AbortController();

  const safeTimeoutMs = Math.min(
    Math.max(Number(timeoutMs) || REQUEST_TIMEOUT_MS, 1000),
    REQUEST_TIMEOUT_MS,
  );

  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, safeTimeoutMs);

  // Preserve the original caller's cancellation signal while also
  // allowing this function to enforce its own request timeout.
  const handleExternalAbort = () => {
    controller.abort(externalSignal.reason);
  };

  if (externalSignal) {
    externalSignal.addEventListener("abort", handleExternalAbort, {
      once: true,
    });

    // Cover cancellation occurring while the listener is being attached.
    if (externalSignal.aborted) {
      handleExternalAbort();
    }
  }

  const requestUrl = String(url);

  const isGooglePlaces = requestUrl.includes("places.googleapis.com");
  const isGeoapify = requestUrl.includes("api.geoapify.com");
  const isOverpass = requestUrl.includes("overpass");
  const isDuckDuckGo = requestUrl.includes("duckduckgo.com");

  const provider = isGooglePlaces
    ? "Google Places"
    : isGeoapify
      ? "Geoapify"
      : isDuckDuckGo
        ? "DuckDuckGo Images"
        : isOverpass
          ? "OpenStreetMap Overpass"
          : "OpenStreetMap/Nominatim";

  try {
    const response = await fetch(url, {
      ...requestOptions,

      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...requestOptions.headers,
      },

      signal: controller.signal,
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error("[External Place API Error]", {
        provider,
        status: response.status,
        body: responseBody.slice(0, 2000),
      });

      const error = new Error(
        `External place service returned HTTP ${response.status}.`,
      );

      error.status = response.status;
      error.provider = provider;

      throw error;
    }

    let data;

    try {
      data = JSON.parse(responseBody);
    } catch {
      console.error("[External Place API] Invalid JSON response:", {
        provider,
        status: response.status,
        body: responseBody.slice(0, 2000),
      });

      throw new AppError(
        "The external place service returned invalid JSON.",
        502,
      );
    }

    // Google may return an empty object when there are no matching places.
    // Accept that as an empty result, but log genuinely unexpected payloads.
    if (
      isGooglePlaces &&
      (!data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        (data.places !== undefined && !Array.isArray(data.places)) ||
        (data.places === undefined && Object.keys(data).length > 0))
    ) {
      console.error("[Google Places] Unexpected successful response:", {
        status: response.status,
        body: responseBody.slice(0, 2000),
      });
    }

    return data;
  } catch (error) {
    // Preserve caller-requested cancellation. Do not convert it into
    // a timeout or an external-service failure.
    if (externalSignal?.aborted && !timedOut) {
      throw error;
    }

    if (error instanceof AppError) {
      throw error;
    }

    if (timedOut || error.name === "AbortError") {
      console.error(`[${provider}] Request timed out:`, {
        timeoutMs: safeTimeoutMs,
        message: error.message,
      });

      throw new AppError(
        "The place search service took too long. Please try again.",
        504,
      );
    }

    if (error.status) {
      console.error(`[${provider}] Request failed:`, {
        status: error.status,
        message: error.message,
      });

      throw new AppError(
        "The place search service is temporarily unavailable.",
        502,
      );
    }

    console.error(`[${provider}] Connection failed:`, error.message);

    throw new AppError(
      "Could not connect to the place search service. Please try again.",
      502,
    );
  } finally {
    clearTimeout(timeout);

    if (externalSignal) {
      externalSignal.removeEventListener("abort", handleExternalAbort);
    }

    activeRequests = Math.max(0, activeRequests - 1);
  }
}

module.exports = {
  NOMINATIM_URL,
  GEOAPIFY_URL,
  OVERPASS_URL,

  GEOAPIFY_API_KEY,
  GOOGLE_PLACES_API_KEY,

  GOOGLE_PLACES_NEARBY_URL,
  GOOGLE_PLACES_TEXT_URL,

  REQUEST_TIMEOUT_MS,

  DEFAULT_RESULTS_LIMIT,
  MAX_RESULTS_LIMIT,
  MIN_QUERY_LENGTH,

  CACHE_TTL_MS,
  MAX_CACHE_ENTRIES,
  MAX_CONCURRENT_REQUESTS,

  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,

  KADUNA_BOUNDS,
  USER_AGENT,

  normalizeText,
  getCached,
  setCached,
  fetchJson,
};

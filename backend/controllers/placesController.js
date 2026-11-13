"use strict";

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { isInsideKaduna } = require("../utils/kadunaBoundary");

const {
  assertSafeSearchQuery,
  filterSafePlaces,
} = require("../utils/adultContentFilter");

const {
  DEFAULT_RESULTS_LIMIT,
  MAX_RESULTS_LIMIT,
  MIN_QUERY_LENGTH,
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  normalizeText,
  getCached,
  setCached,
  fetchJson,
} = require("./placesSearchConfig");

const { findCategoryRule } = require("./placesSearchCategories");

const {
  searchNamedPlace,
  searchGoogleNamedPlace,
  searchGooglePlacesCategory,
  searchGooglePlacesTextCategory,
  searchOverpassCategory,
  searchOsmNamedPlaceBatch,
  searchCategoryWithFallbacks,
} = require("./placesSearchProviders");

const { searchDatabaseDestinations } = require("./placesSearchDatabase");

/* GENERAL HELPERS */

function parseIntegerQuery(value, fallback, name) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    throw new AppError(`${name} must be a whole number.`, 400);
  }

  return number;
}

function normalizeDestinationIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildSearchCacheKey({
  normalizedQuery,
  origin,
  radius,
  limit,
  offset,
  rule,
  excludeDestinationId,
  excludeDestinationSlug,
  excludeDestinationName,
  excludeDestinationLat,
  excludeDestinationLon,
}) {
  return [
    normalizedQuery,
    origin ? origin.latitude.toFixed(5) : "kaduna",
    origin ? origin.longitude.toFixed(5) : "bounds",
    radius,
    limit,
    offset,
    rule?.category || "named-search",
    excludeDestinationId || "no-excluded-id",
    excludeDestinationSlug || "no-excluded-slug",
    excludeDestinationName || "no-excluded-name",
    Number.isFinite(excludeDestinationLat)
      ? excludeDestinationLat.toFixed(5)
      : "no-excluded-lat",
    Number.isFinite(excludeDestinationLon)
      ? excludeDestinationLon.toFixed(5)
      : "no-excluded-lon",
  ].join("|");
}

function sortPlacesByDistance(places, origin) {
  if (!origin || !Array.isArray(places)) {
    return places;
  }

  return [...places].sort((a, b) => {
    const distanceA = Number(a.distanceMeters);
    const distanceB = Number(b.distanceMeters);

    if (!Number.isFinite(distanceA)) {
      return Number.isFinite(distanceB) ? 1 : 0;
    }

    if (!Number.isFinite(distanceB)) {
      return -1;
    }

    return distanceA - distanceB;
  });
}

function getProviderAttribution(source) {
  const sources = String(source || "")
    .split(" + ")
    .map((item) => item.trim());

  const attributions = new Set();

  for (const item of sources) {
    switch (item) {
      case "Google Places":
      case "Google Places Text Search":
        attributions.add("Place data provided by Google");
        break;

      case "Geoapify":
        attributions.add("Place data provided by Geoapify");
        break;

      case "OpenStreetMap":
      case "OpenStreetMap Overpass":
      case "openstreetmap":
        attributions.add("© OpenStreetMap contributors");
        break;

      case "Kaduna Explorer":
        attributions.add("Destinations provided by Kaduna Explorer");
        break;

      default:
        break;
    }
  }

  return attributions.size
    ? [...attributions].join(" | ")
    : "Place data provided by the selected place provider";
}

/* NORMALIZE PLACE IDENTITY FOR DUPLICATE DETECTION */

function getPlaceIdentity(place) {
  const name = normalizeText(place?.name || "");

  if (!name) {
    return null;
  }

  const latitude = Number(place.latitude ?? place.location?.latitude);
  const longitude = Number(place.longitude ?? place.location?.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `${name}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
  }

  return `${name}|${place.placeId || place.id || ""}`;
}

/* MERGE EXTERNAL AND DATABASE RECORDS WITHOUT DUPLICATES */

function mergePlaces(externalPlaces, databasePlaces) {
  const uniquePlaces = new Map();
  const combinedPlaces = [...externalPlaces, ...databasePlaces];

  for (const place of combinedPlaces) {
    const identity = getPlaceIdentity(place);

    if (!identity) {
      continue;
    }

    const existing = uniquePlaces.get(identity);

    if (!existing) {
      uniquePlaces.set(identity, place);
      continue;
    }

    /* Preserve useful information from both records. */

    uniquePlaces.set(identity, {
      ...existing,
      ...place,

      image: place.image || existing.image || null,
      photoUrl: place.photoUrl || existing.photoUrl || null,
      images: place.images?.length ? place.images : existing.images || [],
      phone: place.phone || existing.phone || null,
      website: place.website || existing.website || null,
      openingHours: place.openingHours || existing.openingHours || null,

      distanceMeters: Number.isFinite(Number(place.distanceMeters))
        ? place.distanceMeters
        : existing.distanceMeters,

      sources: [
        ...new Set([
          ...(existing.sources || [existing.source].filter(Boolean)),
          ...(place.sources || [place.source].filter(Boolean)),
        ]),
      ],
    });
  }

  return [...uniquePlaces.values()];
}

/* EXCLUDE THE DESTINATION CURRENTLY BEING VIEWED */

function excludeCurrentDestination(
  places,
  excludeDestinationId,
  excludeDestinationSlug,
  excludeDestinationName,
  excludeDestinationLat,
  excludeDestinationLon,
) {
  if (!Array.isArray(places)) {
    return [];
  }

  const hasDestinationCoordinates =
    Number.isFinite(excludeDestinationLat) &&
    Number.isFinite(excludeDestinationLon);

  if (
    !excludeDestinationId &&
    !excludeDestinationSlug &&
    !excludeDestinationName
  ) {
    return places;
  }

  return places.filter((place) => {
    const identifiers = [place?._id, place?.id, place?.placeId]
      .filter(Boolean)
      .map(normalizeDestinationIdentifier);

    const slug = normalizeDestinationIdentifier(place?.slug);
    const placeName = normalizeText(place?.name || place?.title || "");

    const matchesId =
      excludeDestinationId &&
      identifiers.some(
        (identifier) =>
          identifier === excludeDestinationId ||
          identifier === `kaduna-${excludeDestinationId}` ||
          identifier === `kaduna-explorer-${excludeDestinationId}`,
      );

    const matchesSlug =
      excludeDestinationSlug && slug === excludeDestinationSlug;

    let matchesNameAndLocation = false;

    if (
      excludeDestinationName &&
      placeName === excludeDestinationName &&
      hasDestinationCoordinates
    ) {
      const latitude = Number(
        place?.latitude ??
          place?.location?.latitude ??
          place?.location?.coordinates?.[1],
      );

      const longitude = Number(
        place?.longitude ??
          place?.location?.longitude ??
          place?.location?.coordinates?.[0],
      );

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const toRadians = (value) => (value * Math.PI) / 180;

        const dLat = toRadians(latitude - excludeDestinationLat);
        const dLon = toRadians(longitude - excludeDestinationLon);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRadians(excludeDestinationLat)) *
            Math.cos(toRadians(latitude)) *
            Math.sin(dLon / 2) ** 2;

        const distance =
          6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        matchesNameAndLocation = distance <= 300;
      }
    }

    return !(matchesId || matchesSlug || matchesNameAndLocation);
  });
}

/* GPS VALIDATION */

exports.validateLocation = catchAsync(async (req, res) => {
  const latitudeValue = req.query.lat;
  const longitudeValue = req.query.lon;

  if (
    latitudeValue === undefined ||
    longitudeValue === undefined ||
    latitudeValue === "" ||
    longitudeValue === ""
  ) {
    throw new AppError("Provide both latitude and longitude.", 400);
  }

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new AppError("The supplied coordinates are invalid.", 400);
  }

  const insideKaduna = isInsideKaduna(latitude, longitude);

  if (!insideKaduna) {
    throw new AppError(
      "Your current location is outside Kaduna State. Choose a location within Kaduna State to discover nearby places.",
      400,
    );
  }

  return res.status(200).json({
    status: "success",
    message: "Location is within Kaduna State.",
    data: {
      insideKaduna: true,
      latitude,
      longitude,
    },
  });
});

/* INDEPENDENT DUCKDUCKGO IMAGE SEARCH */

exports.searchPlaceImage = catchAsync(async (req, res) => {
  const query = String(req.query.q || "")
    .trim()
    .slice(0, 220);

  if (query.length < 3) {
    throw new AppError(
      "Provide a place name and locality for image search.",
      400,
    );
  }

  assertSafeSearchQuery(query);

  const cacheKey = `place-image|duckduckgo|${normalizeText(query)}`;
  const cached = getCached(cacheKey);

  /* Reuse both successful and temporarily unavailable lookups. */

  if (cached && cached.source === "DuckDuckGo Images") {
    return res.status(200).json({
      status: "success",
      data: cached,
      cached: true,
    });
  }

  const result = {
    image: null,
    thumbnail: null,
    source: "DuckDuckGo Images",
  };

  let imageSearchStage = "DuckDuckGo landing-page request";

  try {
    /* Step 1: Obtain DuckDuckGo's image-search verification token. */

    const landingUrl = new URL("https://duckduckgo.com/");
    landingUrl.searchParams.set("q", query);
    landingUrl.searchParams.set("iax", "images");
    landingUrl.searchParams.set("ia", "images");

    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";

    const tokenController = new AbortController();
    const tokenTimeout = setTimeout(() => tokenController.abort(), 5000);

    let landingHtml;
    let cookieHeader = "";

    try {
      const landingResponse = await fetch(landingUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: tokenController.signal,
      });

      console.log("[DuckDuckGo Images] Landing page:", {
        status: landingResponse.status,
        ok: landingResponse.ok,
      });

      if (!landingResponse.ok) {
        throw new Error(
          `DuckDuckGo landing page returned HTTP ${landingResponse.status}`,
        );
      }

      /* DuckDuckGo may bind its image token to the landing-page cookies. */

      const setCookies =
        typeof landingResponse.headers.getSetCookie === "function"
          ? landingResponse.headers.getSetCookie()
          : [landingResponse.headers.get("set-cookie")].filter(Boolean);

      cookieHeader = setCookies
        .map((cookie) => String(cookie).split(";")[0])
        .filter(Boolean)
        .join("; ");

      imageSearchStage = "Reading DuckDuckGo landing-page response";
      landingHtml = await landingResponse.text();

      console.log("[DuckDuckGo Images] Landing page content:", {
        htmlLength: landingHtml.length,
        containsVqd: /vqd/i.test(landingHtml),
        hasCookies: Boolean(cookieHeader),
      });
    } finally {
      clearTimeout(tokenTimeout);
    }

    /* Step 2: Extract the verification token. */

    imageSearchStage = "Extracting DuckDuckGo verification token";

    const tokenPatterns = [
      /vqd=["']([^"']+)["']/i,
      /vqd=([^&"'\s]+)/i,
      /"vqd"\s*:\s*"([^"]+)"/i,
    ];

    let vqd = null;

    for (const pattern of tokenPatterns) {
      const match = landingHtml.match(pattern);

      if (match?.[1]) {
        vqd = match[1];
        break;
      }
    }

    console.log("[DuckDuckGo Images] Token extraction:", {
      tokenFound: Boolean(vqd),
      tokenLength: vqd?.length || 0,
    });

    if (!vqd) {
      throw new Error("DuckDuckGo image verification token was not found.");
    }

    /* Step 3: Request image results using the verification token. */

    const params = new URLSearchParams({
      l: "us-en",
      o: "json",
      q: query,
      vqd,
      f: ",,,,,",
      p: "1",
    });

    imageSearchStage = "DuckDuckGo image-results request";

    const imageHeaders = {
      Referer: landingUrl.toString(),
      Origin: "https://duckduckgo.com",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": userAgent,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    };

    if (cookieHeader) {
      imageHeaders.Cookie = cookieHeader;
    }

    const data = await fetchJson(
      `https://duckduckgo.com/i.js?${params.toString()}`,
      {
        headers: imageHeaders,
        timeoutMs: 5000,
      },
    );

    /* Step 4: Select the first result containing a valid HTTP image URL. */

    const candidate = Array.isArray(data?.results)
      ? data.results.find(
          (item) =>
            typeof item?.image === "string" && /^https?:\/\//i.test(item.image),
        )
      : null;

    console.log("[DuckDuckGo Images] Search results:", {
      resultCount: Array.isArray(data?.results) ? data.results.length : 0,
      imageFound: Boolean(candidate),
    });

    if (candidate) {
      result.image = candidate.image;
      result.thumbnail = candidate.thumbnail || null;
      result.title = candidate.title || null;
    }
  } catch (error) {
    console.warn("[DuckDuckGo Images] Image lookup failed:", {
      stage: imageSearchStage,
      name: error.name,
      message: error.message,
      status: error.status || null,
    });
  }

  /* Cache failures as well as successes to avoid repeating a blocked or */
  /* unavailable DDG request for every card. The shared cache TTL is finite. */

  setCached(cacheKey, result);

  return res.status(200).json({
    status: "success",
    data: result,
    cached: false,
  });
});

/* PLACES SEARCH */

exports.searchPlaces = catchAsync(async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (query.length < MIN_QUERY_LENGTH) {
    throw new AppError(
      `Enter at least ${MIN_QUERY_LENGTH} characters to search for places.`,
      400,
    );
  }

  if (query.length > 150) {
    throw new AppError("Your search query is too long.", 400);
  }

  /* Block unsupported adult-content searches while permitting */
  /* legitimate healthcare and sexual health searches. */

  assertSafeSearchQuery(query);

  const limit = parseIntegerQuery(
    req.query.limit,
    DEFAULT_RESULTS_LIMIT,
    "limit",
  );

  const offset = parseIntegerQuery(req.query.offset, 0, "offset");

  if (limit < 1 || limit > MAX_RESULTS_LIMIT) {
    throw new AppError(
      `limit must be between 1 and ${MAX_RESULTS_LIMIT}.`,
      400,
    );
  }

  if (offset < 0 || offset > 100000) {
    throw new AppError("offset must be between 0 and 100000.", 400);
  }

  /* Optional identifiers for the destination currently being viewed. */

  const excludeDestinationId = normalizeDestinationIdentifier(
    req.query.excludeDestinationId,
  );

  const excludeDestinationSlug = normalizeDestinationIdentifier(
    req.query.excludeDestinationSlug,
  );

  const excludeDestinationName = normalizeText(
    String(req.query.excludeDestinationName || "").trim(),
  );

  const hasExcludeLatitude =
    req.query.excludeDestinationLat !== undefined &&
    req.query.excludeDestinationLat !== "";

  const hasExcludeLongitude =
    req.query.excludeDestinationLon !== undefined &&
    req.query.excludeDestinationLon !== "";

  if (hasExcludeLatitude !== hasExcludeLongitude) {
    throw new AppError("Provide both excluded destination coordinates.", 400);
  }

  let excludeDestinationLat = null;
  let excludeDestinationLon = null;

  if (hasExcludeLatitude && hasExcludeLongitude) {
    excludeDestinationLat = Number(req.query.excludeDestinationLat);
    excludeDestinationLon = Number(req.query.excludeDestinationLon);

    if (
      !Number.isFinite(excludeDestinationLat) ||
      !Number.isFinite(excludeDestinationLon) ||
      excludeDestinationLat < -90 ||
      excludeDestinationLat > 90 ||
      excludeDestinationLon < -180 ||
      excludeDestinationLon > 180
    ) {
      throw new AppError(
        "The excluded destination coordinates are invalid.",
        400,
      );
    }
  }

  if (
    excludeDestinationId.length > 100 ||
    excludeDestinationSlug.length > 200 ||
    excludeDestinationName.length > 200
  ) {
    throw new AppError("The excluded destination identifier is invalid.", 400);
  }

  /* Coordinates must be supplied together. */

  const hasLatitude = req.query.lat !== undefined && req.query.lat !== "";
  const hasLongitude = req.query.lon !== undefined && req.query.lon !== "";

  if (hasLatitude !== hasLongitude) {
    throw new AppError(
      "Provide both lat and lon to search around a location.",
      400,
    );
  }

  let origin = null;

  if (hasLatitude && hasLongitude) {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new AppError("The supplied coordinates are invalid.", 400);
    }

    if (!isInsideKaduna(latitude, longitude)) {
      throw new AppError(
        "Your current location is outside Kaduna State. Choose a location within Kaduna State to discover nearby places.",
        400,
      );
    }

    origin = {
      latitude,
      longitude,
    };
  }

  const radius = parseIntegerQuery(
    req.query.radius,
    DEFAULT_RADIUS_METERS,
    "radius",
  );

  if (radius < 100 || radius > MAX_RADIUS_METERS) {
    throw new AppError(
      `Radius must be between 100 and ${MAX_RADIUS_METERS} meters.`,
      400,
    );
  }

  const normalizedQuery = normalizeText(query);
  const rule = findCategoryRule(query);

  /* ADMIN LOCATION LOOKUP: Google first, OSM only as a clean fallback. */
  if (String(req.query.purpose || "").toLowerCase() === "location") {
    const locationLimit = Math.min(8, limit);
    let places = [];
    let source = "Google Places";
    let googleError = null;

    const ignoredQueryWords = new Set(["of", "the", "and", "in", "at"]);
    const queryWords = normalizedQuery
      .split(/[^a-z0-9]+/)
      .filter((word) => word && !ignoredQueryWords.has(word));
    const filterLocationNameMatches = (items) =>
      (items || []).filter((place) => {
        // Include the provider address so a town/area in the query can
        // validate a named landmark without admitting unrelated Kaduna places.
        const searchableText = [
          place?.name,
          place?.address,
          place?.formattedAddress,
        ]
          .filter(Boolean)
          .join(" ");
        const placeWords = normalizeText(searchableText)
          .split(/[^a-z0-9]+/)
          .filter(Boolean);
        const matchedWords = queryWords.filter((word) =>
          placeWords.includes(word),
        );
        const coverage = queryWords.length
          ? matchedWords.length / queryWords.length
          : 0;

        return coverage >= (queryWords.length === 1 ? 1 : 0.6);
      });

    try {
      const googleResult = await searchGoogleNamedPlace(
        query,
        origin,
        radius,
        locationLimit,
      );

      places = filterLocationNameMatches(
        excludeCurrentDestination(
          filterSafePlaces(googleResult?.places || []),
          excludeDestinationId,
          excludeDestinationSlug,
          excludeDestinationName,
          excludeDestinationLat,
          excludeDestinationLon,
        ),
      ).slice(0, locationLimit);
    } catch (error) {
      googleError = error;
    }

    /* Never mix providers: use OSM only when Google errors or has no usable hits. */
    if (!places.length) {
      try {
        const osmResult = await searchOsmNamedPlaceBatch(
          query,
          origin,
          radius,
          locationLimit,
        );

        places = filterLocationNameMatches(
          excludeCurrentDestination(
            filterSafePlaces(osmResult?.places || []),
            excludeDestinationId,
            excludeDestinationSlug,
            excludeDestinationName,
            excludeDestinationLat,
            excludeDestinationLon,
          ),
        ).slice(0, locationLimit);

        source = "OpenStreetMap";
      } catch {
        if (googleError && !places.length) {
          throw new AppError(
            "Google Places and OpenStreetMap location search are temporarily unavailable. Please try again or set the position on the map.",
            503,
          );
        }

        places = [];
        source = "OpenStreetMap";
      }
    }

    return res.status(200).json({
      status: "success",
      source,
      attribution: getProviderAttribution(source),
      query: normalizedQuery,
      results: places.length,
      pagination: {
        limit: locationLimit,
        offset: 0,
        returned: places.length,
        totalMatched: places.length,
        hasMore: false,
        nextProvider: null,
        supported: false,
      },
      search: {
        mode: "admin-location-lookup",
        provider: source === "Google Places" ? "google" : "osm",
        category: null,
        origin,
        radiusMeters: origin ? radius : null,
      },
      data: {
        places,
        externalPlaces: places,
      },
      cached: false,
    });
  }

  /* PROGRESSIVE EXTERNAL SEARCH */

  const requestedProvider = String(req.query.provider || "").toLowerCase();

  if (["google", "osm", "google-more"].includes(requestedProvider)) {
    const batchLimit = 8;

    /* A Google request with a non-zero offset means the frontend */
    /* is requesting the next Google batch, not a new initial search. */

    const effectiveProvider =
      requestedProvider === "google" && offset > 0
        ? "google-more"
        : requestedProvider;

    const searchKey = [
      "progressive-search",
      normalizedQuery,
      origin ? origin.latitude.toFixed(5) : "kaduna",
      origin ? origin.longitude.toFixed(5) : "bounds",
      radius,
      rule?.category || "named-search",
      excludeDestinationId || "no-excluded-id",
      excludeDestinationSlug || "no-excluded-slug",
      excludeDestinationName || "no-excluded-name",
      Number.isFinite(excludeDestinationLat)
        ? excludeDestinationLat.toFixed(5)
        : "no-excluded-lat",
      Number.isFinite(excludeDestinationLon)
        ? excludeDestinationLon.toFixed(5)
        : "no-excluded-lon",
    ].join("|");

    const googleKey = `${searchKey}|google-first`;
    const osmKey = `${searchKey}|osm`;
    const googlePoolKey = `${searchKey}|google-pool`;
    const googleMoreKey = `${searchKey}|google-more-batches`;

    /* Include provider and request offset so different batches */
    /* cannot accidentally reuse the same cached response. */

    const responseCacheKey = `${searchKey}|${effectiveProvider}|${offset}`;

    const cachedResponse = getCached(responseCacheKey);

    if (cachedResponse) {
      return res.status(200).json({
        ...cachedResponse,
        cached: true,
      });
    }

    const initialGoogle = getCached(googleKey);
    const osmBatch = getCached(osmKey);
    const googleMoreBatches = getCached(googleMoreKey) || [];

    /* DUPLICATE DETECTION */

    const isDuplicate = (candidate, existing) => {
      const candidateIds = [candidate?.placeId, candidate?.id, candidate?._id]
        .filter(Boolean)
        .map(String);

      const existingIds = [existing?.placeId, existing?.id, existing?._id]
        .filter(Boolean)
        .map(String);

      if (candidateIds.some((id) => existingIds.includes(id))) {
        return true;
      }

      const nameA = normalizeText(candidate?.name || "");
      const nameB = normalizeText(existing?.name || "");

      if (!nameA || !nameB) {
        return false;
      }

      const latA = Number(candidate.latitude ?? candidate.location?.latitude);
      const lonA = Number(candidate.longitude ?? candidate.location?.longitude);
      const latB = Number(existing.latitude ?? existing.location?.latitude);
      const lonB = Number(existing.longitude ?? existing.location?.longitude);

      if (![latA, lonA, latB, lonB].every(Number.isFinite)) {
        return nameA === nameB;
      }

      const toRadians = (value) => (value * Math.PI) / 180;

      const dLat = toRadians(latB - latA);
      const dLon = toRadians(lonB - lonA);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(latA)) *
          Math.cos(toRadians(latB)) *
          Math.sin(dLon / 2) ** 2;

      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return nameA === nameB && distance <= 100;
    };

    const removeExisting = (places, excluded = []) => {
      const unique = [];
      const exclusionList = Array.isArray(excluded) ? excluded : [];

      for (const place of places || []) {
        const alreadyExists = [...exclusionList, ...unique].some((item) =>
          isDuplicate(place, item),
        );

        if (!alreadyExists) {
          unique.push(place);
        }
      }

      return unique;
    };

    /* Reconstruct every batch already displayed to the user. */

    const existingPlaces = [
      ...(initialGoogle?.places || []),
      ...(osmBatch?.places || []),
      ...googleMoreBatches.flatMap((batch) => batch?.places || []),
    ];

    /* GOOGLE RESULT POOL */

    const fetchGooglePool = async () => {
      const cachedPool = getCached(googlePoolKey);

      if (cachedPool) {
        return cachedPool;
      }

      const result = rule
        ? origin
          ? await searchGooglePlacesCategory(rule, origin, radius, 20, 0)
          : await searchGooglePlacesTextCategory(rule, null, radius, 20, 0)
        : await searchGoogleNamedPlace(query, origin, radius, 20);

      const pool = excludeCurrentDestination(
        filterSafePlaces(result?.places || []),
        excludeDestinationId,
        excludeDestinationSlug,
        excludeDestinationName,
        excludeDestinationLat,
        excludeDestinationLon,
      );

      setCached(googlePoolKey, pool);

      return pool;
    };

    let places = [];
    let source = "";
    let nextProvider = null;

    /* INITIAL GOOGLE BATCH */

    if (effectiveProvider === "google") {
      const result = rule
        ? origin
          ? await searchGooglePlacesCategory(
              rule,
              origin,
              radius,
              batchLimit,
              0,
            )
          : await searchGooglePlacesTextCategory(
              rule,
              null,
              radius,
              batchLimit,
              0,
            )
        : await searchGoogleNamedPlace(query, origin, radius, batchLimit);

      places = excludeCurrentDestination(
        filterSafePlaces(result?.places || []),
        excludeDestinationId,
        excludeDestinationSlug,
        excludeDestinationName,
        excludeDestinationLat,
        excludeDestinationLon,
      ).slice(0, batchLimit);

      source = result?.source || "Google Places";

      setCached(googleKey, {
        places,
        source,
      });

      /* Show more is available only when the initial batch is complete. */

      nextProvider = places.length === batchLimit ? "osm" : null;
    } else {
      if (!initialGoogle) {
        throw new AppError(
          "Start a Google search before requesting more places.",
          400,
        );
      }

      if (initialGoogle.places.length < batchLimit) {
        throw new AppError(
          "There are no more places to load for this search.",
          400,
        );
      }

      /* OSM BATCH */

      if (effectiveProvider === "osm") {
        let osmResult = null;

        try {
          osmResult = rule
            ? await searchOverpassCategory(
                rule,
                origin,
                radius,
                batchLimit,
                0,
                existingPlaces,
              )
            : await searchOsmNamedPlaceBatch(
                query,
                origin,
                radius,
                batchLimit,
                existingPlaces,
              );
        } catch (error) {
          /* OSM is a secondary batch provider. A timeout or provider error */
          /* must not leave the user's Show more action waiting or failing. */

          console.warn("[Places Search] OSM batch failed; using Google:", {
            name: error.name,
            message: error.message,
            status: error.status || null,
          });
        }

        places = removeExisting(
          excludeCurrentDestination(
            filterSafePlaces(osmResult?.places || []),
            excludeDestinationId,
            excludeDestinationSlug,
            excludeDestinationName,
            excludeDestinationLat,
            excludeDestinationLon,
          ),
          existingPlaces,
        ).slice(0, batchLimit);

        if (places.length) {
          source = osmResult?.source || "OpenStreetMap";

          setCached(osmKey, {
            places,
            source,
          });

          nextProvider = "google-more";
        } else {
          /* OSM failed, timed out, or returned no new unique places. */
          /* Fall back to Google immediately on this same request. */

          const googlePool = await fetchGooglePool();

          places = removeExisting(googlePool, existingPlaces).slice(
            0,
            Math.min(batchLimit, 20 - existingPlaces.length),
          );

          source = "Google Places";

          /* Store the fallback batch in the OSM batch slot because */
          /* it was returned during the OSM Show more request. */

          setCached(osmKey, {
            places,
            source,
          });

          nextProvider =
            places.length && existingPlaces.length + places.length < 20
              ? "google-more"
              : null;
        }
      } else {
        /* SUBSEQUENT GOOGLE BATCH */

        const googlePool = await fetchGooglePool();

        /* Remove every place already displayed across all providers. */

        places = removeExisting(googlePool, existingPlaces).slice(
          0,
          Math.min(batchLimit, 20 - existingPlaces.length),
        );

        source = "Google Places";

        /* Keep a stable Google pool. Store each returned batch separately. */

        if (places.length) {
          setCached(googleMoreKey, [
            ...googleMoreBatches,
            {
              places,
              source,
            },
          ]);
        }

        nextProvider =
          places.length && existingPlaces.length + places.length < 20
            ? "google-more"
            : null;
      }
    }

    const totalDisplayed = existingPlaces.length + places.length;

    const responseBody = {
      status: "success",
      source,
      attribution: getProviderAttribution(source),
      query: normalizedQuery,
      results: places.length,

      pagination: {
        limit: batchLimit,
        offset: existingPlaces.length,
        returned: places.length,
        totalMatched: totalDisplayed,
        hasMore: Boolean(nextProvider) && totalDisplayed < 20,
        nextProvider: totalDisplayed < 20 ? nextProvider : null,
        supported: true,
      },

      search: {
        mode: origin ? "nearby-progressive" : "kaduna-progressive",
        provider: effectiveProvider,
        category: rule?.category || null,
        origin,
        radiusMeters: origin ? radius : null,
      },

      data: {
        places,
        externalPlaces: places,
      },

      cached: false,
    };

    setCached(responseCacheKey, responseBody);

    return res.status(200).json(responseBody);
  }

  /* LEGACY / NEARBY SEARCH */

  const cacheKey = buildSearchCacheKey({
    normalizedQuery,
    origin,
    radius,
    limit,
    offset,
    rule,
    excludeDestinationId,
    excludeDestinationSlug,
    excludeDestinationName,
    excludeDestinationLat,
    excludeDestinationLon,
  });

  /* Return cached results when available. */

  const cached = getCached(cacheKey);

  if (cached) {
    const safePlaces = sortPlacesByDistance(
      filterSafePlaces(
        excludeCurrentDestination(
          cached.data?.places || [],
          excludeDestinationId,
          excludeDestinationSlug,
          excludeDestinationName,
          excludeDestinationLat,
          excludeDestinationLon,
        ),
      ),
      origin,
    );

    return res.status(200).json({
      ...cached,

      results: safePlaces.length,

      pagination: {
        ...cached.pagination,
        returned: safePlaces.length,
      },

      data: {
        ...cached.data,
        places: safePlaces,
      },

      cached: true,
    });
  }

  /* Give both search sources enough records to support merging */
  /* before the final pagination is applied. */

  const providerLimit = MAX_RESULTS_LIMIT;

  /* Search external providers and MongoDB concurrently. */

  const [providerOutcome, databaseOutcome] = await Promise.allSettled([
    rule
      ? searchCategoryWithFallbacks({
          rule,
          origin,
          radius,
          limit: providerLimit,
          offset: 0,
        })
      : searchNamedPlace(query, origin, radius, providerLimit, 0),

    searchDatabaseDestinations({
      query,
      rule,
      origin,
      radius,
      limit: MAX_RESULTS_LIMIT,
    }),
  ]);

  const externalResult =
    providerOutcome.status === "fulfilled" ? providerOutcome.value : null;

  const databasePlaces =
    databaseOutcome.status === "fulfilled" ? databaseOutcome.value : [];

  /* If both sources fail, return the provider error. */

  if (
    providerOutcome.status === "rejected" &&
    databaseOutcome.status === "rejected"
  ) {
    console.error(
      "[Places Search] External provider error:",
      providerOutcome.reason?.message,
    );

    console.error(
      "[Places Search] MongoDB search error:",
      databaseOutcome.reason?.message,
    );

    throw providerOutcome.reason;
  }

  if (providerOutcome.status === "rejected") {
    console.error(
      "[Places Search] External provider failed:",
      providerOutcome.reason?.message,
    );
  }

  if (databaseOutcome.status === "rejected") {
    console.error(
      "[Places Search] MongoDB search failed:",
      databaseOutcome.reason?.message,
    );
  }

  const externalPlaces = Array.isArray(externalResult?.places)
    ? externalResult.places
    : [];

  /* Merge external results with saved Kaduna Explorer destinations. */

  const combinedPlaces = mergePlaces(externalPlaces, databasePlaces);

  /* Remove the currently viewed saved destination before pagination. */

  const placesWithoutCurrentDestination = excludeCurrentDestination(
    combinedPlaces,
    excludeDestinationId,
    excludeDestinationSlug,
    excludeDestinationName,
    excludeDestinationLat,
    excludeDestinationLon,
  );

  /* Apply safety filtering and distance sorting. */

  const allSafePlaces = sortPlacesByDistance(
    filterSafePlaces(placesWithoutCurrentDestination),
    origin,
  );

  /* Pagination happens after merging, deduplication and exclusion. */

  const places = allSafePlaces.slice(offset, offset + limit);

  /* Build the combined source information. */

  const sourceParts = [
    externalResult?.source || null,
    databasePlaces.length > 0 ? "Kaduna Explorer" : null,
  ].filter(Boolean);

  const source = sourceParts.length
    ? [...new Set(sourceParts)].join(" + ")
    : "Unknown provider";

  const responseBody = {
    status: "success",
    source,
    attribution: getProviderAttribution(source),
    query: normalizedQuery,
    results: places.length,

    pagination: {
      limit,
      offset,
      returned: places.length,
      providerReturned: externalPlaces.length,
      databaseReturned: databasePlaces.length,
      totalMatched: allSafePlaces.length,
      hasMore: allSafePlaces.length > offset + limit,
      nextOffset: allSafePlaces.length > offset + limit ? offset + limit : null,
      supported: true,
    },

    search: {
      mode: rule
        ? origin
          ? "nearby-category"
          : "kaduna-category"
        : origin
          ? "nearby-named-place"
          : "named-place",

      category: rule?.category || null,
      origin,
      radiusMeters: origin ? radius : null,
    },

    data: {
      places,
    },

    cached: false,
  };

  /* Google Photos are not requested by the current Google field mask. */
  /* Retain this guard for compatibility with older cached responses. */

  const isGooglePhotoResponse = source.includes("Google Places");

  if (!isGooglePhotoResponse) {
    setCached(cacheKey, responseBody);
  }

  return res.status(200).json(responseBody);
});

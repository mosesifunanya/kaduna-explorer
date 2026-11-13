"use strict";

const AppError = require("../utils/appError");
const { isInsideKaduna } = require("../utils/kadunaBoundary");

const {
  NOMINATIM_URL,
  GEOAPIFY_URL,
  OVERPASS_URL,
  GEOAPIFY_API_KEY,
  GOOGLE_PLACES_API_KEY,
  GOOGLE_PLACES_NEARBY_URL,
  GOOGLE_PLACES_TEXT_URL,
  MAX_RESULTS_LIMIT,
  MAX_RADIUS_METERS,
  DEFAULT_RADIUS_METERS,
  KADUNA_BOUNDS,
  USER_AGENT,
  fetchJson,
} = require("./placesSearchConfig");

const {
  getGoogleIncludedTypes,
  getGoogleTextQuery,
  getGeoapifyMatchCategories,
  OVERPASS_CATEGORY_TAGS,
} = require("./placesSearchCategories");

const RETAIL_OSM_SHOP_TYPES = new Set([
  "supermarket",
  "convenience",
  "general",
  "greengrocer",
  "department_store",
  "mall",
  "wholesale",
  "variety_store",
  "food",
  "beverages",
  "health_food",
]);

const FOOD_SERVICE_CATEGORIES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "ice-cream",
  "dessert",
  "food-dining",
]);

/* GENERAL HELPERS */

function distanceInMeters(a, b) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

function getCategoryName(ruleOrCategory) {
  if (typeof ruleOrCategory === "string") {
    return ruleOrCategory;
  }

  return ruleOrCategory?.category || null;
}

function normalizeCategoryValue(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function getGoogleTypes(place) {
  return [
    place?.primaryType,
    ...(Array.isArray(place?.types) ? place.types : []),
  ]
    .filter(Boolean)
    .map(normalizeCategoryValue);
}

function getRawOsmTags(properties) {
  const raw = properties?.datasource?.raw || {};

  return {
    ...raw,
    ...(raw.tags && typeof raw.tags === "object" ? raw.tags : {}),
  };
}

/**
 * Religious classification is deliberately limited to 2 search categories:
 * church and mosque. Mosque-specific evidence always takes precedence.
 * General prayer-centre wording belongs to Church unless Muslim/mosque
 * evidence is present.
 */
function normalizeReligionText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getReligiousTextCandidates(record = {}, tags = {}) {
  const displayName = record.displayName?.text || record.name || "";
  const properties = record.properties || {};
  const raw = properties.datasource?.raw || {};

  const candidates = [
    displayName,
    record.primaryType,
    ...(Array.isArray(record.types) ? record.types : []),
    record.type,
    record.religion,
    record.denomination,
    record.brand,
    record.alt_name,
    record["name:en"],
    tags.name,
    tags["name:en"],
    tags.alt_name,
    tags.brand,
    tags.religion,
    tags.denomination,
    tags.amenity,
    tags.building,
    tags.place,
    raw.name,
    raw["name:en"],
    raw.alt_name,
    raw.brand,
    raw.religion,
    raw.denomination,
    properties.name,
    properties.address_line1,
  ];

  return candidates.map(normalizeReligionText).filter(Boolean);
}

function classifyReligiousPlace(record = {}, tags = {}) {
  const text = getReligiousTextCandidates(record, tags);
  const combined = text.join(" | ");
  const religion = normalizeReligionText(tags.religion || record.religion);

  // Exclude religions outside the requested Church/Mosque categories.
  // A generic worship or prayer-centre label must not absorb these places.
  const otherReligionEvidence =
    /(^| )(hindu|hinduism|buddhist|buddhism|sikh|sikhism|jain|jainism|taoist|taoism|shinto|zoroastrian)( |$)/.test(
      combined,
    ) ||
    /(^| )(temple|mandir|gurdwara|gurudwara|vihara|pagoda)( |$)/.test(
      combined,
    ) ||
    [
      "hindu",
      "buddhist",
      "sikh",
      "jain",
      "taoist",
      "shinto",
      "zoroastrian",
    ].includes(religion);

  if (otherReligionEvidence) {
    return null;
  }

  const mosqueEvidence =
    /(^| )(mosque|masjid|musalla|musallah|jumuah|jummah)( |$)/.test(combined) ||
    /central mosque|grand mosque|national mosque|congregational mosque/.test(
      combined,
    ) ||
    /(^| )(islam|islamic|muslim)( |$)/.test(combined) ||
    ["muslim", "islam"].includes(religion);

  if (mosqueEvidence) {
    return "mosque";
  }

  const churchEvidence =
    /(^| )(church|chapel|cathedral|synagogue|pentecostal|orthodox|baptist|methodist|anglican|catholic|presbyterian|apostolic|evangelical)( |$)/.test(
      combined,
    ) ||
    /prayer cent(re|er)/.test(combined) ||
    /(^| )(christian|christianity|jewish|judaism)( |$)/.test(combined) ||
    ["christian", "jewish"].includes(religion);

  return churchEvidence ? "church" : null;
}

function isRequestedReligiousCategory(record, category, tags = {}) {
  if (category !== "church" && category !== "mosque") {
    return true;
  }

  return classifyReligiousPlace(record, tags) === category;
}

function getGeoapifyCategories(feature) {
  const categories = feature?.properties?.categories;

  if (!Array.isArray(categories)) {
    return [];
  }

  return categories.map((item) => String(item).toLowerCase());
}

function isCategoryMatch(categories, allowedCategories) {
  const allowed = new Set(
    (allowedCategories || []).map((item) => String(item).toLowerCase()),
  );

  return categories.some((actual) => allowed.has(String(actual).toLowerCase()));
}

function isInsideRequestedRadius(place, origin, radius) {
  if (!origin) {
    return true;
  }

  if (!Number.isFinite(place?.distanceMeters)) {
    return false;
  }

  return place.distanceMeters <= radius;
}

function getGoogleAllowedTypes(category) {
  return getGoogleIncludedTypes(category);
}

/**
 * RESTAURANT-SPECIFIC EXCLUSIONS
 *
 * Some provider listings have broad or incorrect categories.
 * Explicit food-service classification takes precedence over
 * secondary retail tags.
 */
function isExplicitRetailBusiness(tags = {}) {
  const shop = normalizeCategoryValue(tags.shop);
  const amenity = normalizeCategoryValue(tags.amenity);

  // A genuine food-service amenity takes precedence over a secondary shop tag.
  if (
    ["restaurant", "fast_food", "food_court", "cafe", "ice_cream"].includes(
      amenity,
    )
  ) {
    return false;
  }

  if (RETAIL_OSM_SHOP_TYPES.has(shop)) {
    return true;
  }

  if (shop && !["bakery", "pastry", "confectionery"].includes(shop)) {
    return true;
  }

  return ["marketplace", "fuel", "bank", "pharmacy"].includes(amenity);
}

function isGooglePlaceRelevant(place, ruleOrCategory) {
  const category = getCategoryName(ruleOrCategory);
  const types = getGoogleTypes(place);

  if (!category) {
    return false;
  }

  if (category === "church" || category === "mosque") {
    return isRequestedReligiousCategory(place, category);
  }

  if (!types.length) {
    return false;
  }

  const acceptedTypes = getGoogleAllowedTypes(category);

  if (!acceptedTypes.length) {
    return false;
  }

  const excludedFoodTypes = {
    restaurant: [
      "cafe",
      "bakery",
      "ice_cream_shop",
      "dessert_shop",
      "juice_shop",
      "supermarket",
      "convenience_store",
      "grocery_store",
      "shopping_mall",
      "market",
      "department_store",
    ],

    cafe: [
      "restaurant",
      "fast_food_restaurant",
      "food_court",
      "bakery",
      "ice_cream_shop",
      "supermarket",
      "grocery_store",
    ],

    bakery: [
      "restaurant",
      "fast_food_restaurant",
      "food_court",
      "cafe",
      "ice_cream_shop",
      "supermarket",
      "grocery_store",
    ],

    "ice-cream": [
      "restaurant",
      "fast_food_restaurant",
      "food_court",
      "cafe",
      "bakery",
      "supermarket",
      "grocery_store",
    ],

    dessert: [
      "restaurant",
      "fast_food_restaurant",
      "food_court",
      "cafe",
      "bakery",
      "ice_cream_shop",
      "supermarket",
      "grocery_store",
    ],
  };

  const excluded = excludedFoodTypes[category] || [];

  if (types.some((type) => excluded.includes(type))) {
    return false;
  }

  return types.some((type) => acceptedTypes.includes(type));
}

/* GOOGLE PLACES MAPPING */

/**
 * Google is used for place data only.
 * Images are not requested from Google.
 */
function mapGooglePlace(place, origin, category) {
  const location = place?.location || {};
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !isInsideKaduna(latitude, longitude)
  ) {
    return null;
  }

  const name =
    place.displayName?.text ||
    place.shortFormattedAddress ||
    place.formattedAddress ||
    "Unnamed place";

  const mapped = {
    id: `google-${place.id}`,
    source: "Google Places",
    name,
    category,
    latitude,
    longitude,
    address: place.formattedAddress || place.shortFormattedAddress || "",
    image: null,
    placeId: place.id,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri:
      place.googleMapsUri ||
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  };

  if (origin) {
    mapped.distanceMeters = distanceInMeters(origin, {
      latitude,
      longitude,
    });
  }

  return mapped;
}

function buildGoogleFieldMask() {
  return [
    "places.id",
    "places.displayName",
    "places.location",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.googleMapsUri",
    "places.rating",
    "places.userRatingCount",
    "places.primaryType",
    "places.types",
  ].join(",");
}

async function mapGooglePlacesResponse(data, origin, radius, category) {
  const hasPlaces = Boolean(
    data &&
    typeof data === "object" &&
    Object.prototype.hasOwnProperty.call(data, "places"),
  );

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    (hasPlaces && !Array.isArray(data.places)) ||
    (!hasPlaces && Object.keys(data).length > 0)
  ) {
    throw new AppError("Google Places returned an invalid response.", 502);
  }

  const googlePlaces = hasPlaces ? data.places : [];
  const unique = new Map();

  for (const place of googlePlaces) {
    if (!isGooglePlaceRelevant(place, category)) {
      continue;
    }

    const mapped = mapGooglePlace(place, origin, category);

    if (!mapped || !isInsideRequestedRadius(mapped, origin, radius)) {
      continue;
    }

    unique.set(mapped.id, mapped);
  }

  const places = [...unique.values()].sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );

  return places;
}

/* GOOGLE NEARBY SEARCH */

/**
 * Used for GPS-based searches inside Kaduna State.
 */
async function searchGooglePlacesCategory(rule, origin, radius, limit, offset) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new AppError("Google Places API key is not configured.", 500);
  }

  if (!origin) {
    throw new AppError(
      "Google Nearby Search requires latitude and longitude.",
      400,
    );
  }

  const includedTypes = getGoogleAllowedTypes(rule.category);

  if (!includedTypes.length) {
    return {
      places: [],
      providerCount: 0,
      limit,
      offset,
      hasMore: false,
      nextOffset: null,
      source: "Google Places",
    };
  }

  const data = await fetchJson(GOOGLE_PLACES_NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": buildGoogleFieldMask(),
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: Math.min(20, Math.max(1, limit + offset)),
      locationRestriction: {
        circle: {
          center: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
          radius: Math.min(radius, MAX_RADIUS_METERS),
        },
      },
      rankPreference: "DISTANCE",
    }),
  });

  const places = await mapGooglePlacesResponse(
    data,
    origin,
    radius,
    rule.category,
  );

  return {
    places: places.slice(offset, offset + limit),
    providerCount: places.length,
    limit,
    offset,
    hasMore: places.length > offset + limit,
    nextOffset: places.length > offset + limit ? offset + limit : null,
    source: "Google Places",
  };
}

/* GOOGLE TEXT SEARCH */

/**
 * Used for statewide searches and restricted to Kaduna bounds.
 */
async function searchGooglePlacesTextCategory(
  rule,
  origin,
  radius,
  limit,
  offset,
) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new AppError("Google Places API key is not configured.", 500);
  }

  const textQuery = getGoogleTextQuery(rule, origin);

  const searchRadius = Math.min(
    radius || DEFAULT_RADIUS_METERS,
    MAX_RADIUS_METERS,
  );

  const requestBody = {
    textQuery,
    pageSize: Math.min(20, Math.max(1, limit + offset)),
  };

  if (origin) {
    const latitudeDelta = searchRadius / 111320;

    const longitudeScale = Math.max(
      0.1,
      Math.cos((origin.latitude * Math.PI) / 180),
    );

    const longitudeDelta = searchRadius / (111320 * longitudeScale);

    requestBody.locationRestriction = {
      rectangle: {
        low: {
          latitude: Math.max(-90, origin.latitude - latitudeDelta),
          longitude: Math.max(-180, origin.longitude - longitudeDelta),
        },
        high: {
          latitude: Math.min(90, origin.latitude + latitudeDelta),
          longitude: Math.min(180, origin.longitude + longitudeDelta),
        },
      },
    };
  } else {
    const { south, west, north, east } = KADUNA_BOUNDS;

    requestBody.locationRestriction = {
      rectangle: {
        low: {
          latitude: south,
          longitude: west,
        },
        high: {
          latitude: north,
          longitude: east,
        },
      },
    };
  }

  const data = await fetchJson(GOOGLE_PLACES_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": buildGoogleFieldMask(),
    },
    body: JSON.stringify(requestBody),
  });

  const places = await mapGooglePlacesResponse(
    data,
    origin,
    searchRadius,
    rule.category,
  );

  places.sort((a, b) => {
    if (origin) {
      return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return {
    places: places.slice(offset, offset + limit),
    providerCount: places.length,
    limit,
    offset,
    hasMore: places.length > offset + limit,
    nextOffset: places.length > offset + limit ? offset + limit : null,
    source: "Google Places Text Search",
  };
}

/* GEOAPIFY CATEGORY FILTERING */

function isGeoapifyPlaceRelevant(feature, ruleOrCategory) {
  const properties = feature?.properties || {};
  const category = getCategoryName(ruleOrCategory);

  if (!category) {
    return false;
  }

  const categories = getGeoapifyCategories(feature);
  const tags = getRawOsmTags(properties);

  if (category === "church" || category === "mosque") {
    const religiousCategory = classifyReligiousPlace(
      {
        name: properties.name || properties.address_line1,
        properties,
      },
      tags,
    );

    return religiousCategory === category;
  }

  if (FOOD_SERVICE_CATEGORIES.has(category) && isExplicitRetailBusiness(tags)) {
    return false;
  }

  if (category === "restaurant") {
    if (
      tags.amenity &&
      ["cafe", "ice_cream", "bakery"].includes(
        normalizeCategoryValue(tags.amenity),
      )
    ) {
      return false;
    }

    if (tags.shop && normalizeCategoryValue(tags.shop)) {
      return false;
    }
  }

  if (category === "cafe") {
    return (
      normalizeCategoryValue(tags.amenity) === "cafe" ||
      categories.includes("catering.cafe")
    );
  }

  if (category === "bakery") {
    return (
      normalizeCategoryValue(tags.shop) === "bakery" ||
      isCategoryMatch(categories, getGeoapifyMatchCategories(ruleOrCategory))
    );
  }

  if (category === "ice-cream") {
    return (
      normalizeCategoryValue(tags.amenity) === "ice_cream" ||
      isCategoryMatch(categories, getGeoapifyMatchCategories(ruleOrCategory))
    );
  }

  if (category === "dessert") {
    return (
      ["pastry", "confectionery"].includes(normalizeCategoryValue(tags.shop)) ||
      isCategoryMatch(categories, getGeoapifyMatchCategories(ruleOrCategory))
    );
  }

  return isCategoryMatch(
    categories,
    getGeoapifyMatchCategories(ruleOrCategory),
  );
}

/* GEOAPIFY PLACE MAPPING */

function mapGeoapifyPlace(feature, origin, ruleOrCategory) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates;
  const category = getCategoryName(ruleOrCategory);

  const longitude = Number(properties.lon ?? coordinates?.[0]);
  const latitude = Number(properties.lat ?? coordinates?.[1]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !isInsideKaduna(latitude, longitude) ||
    !isGeoapifyPlaceRelevant(feature, ruleOrCategory)
  ) {
    return null;
  }

  const name =
    properties.name ||
    properties.address_line1 ||
    properties.formatted ||
    "Unnamed place";

  const place = {
    id: `geoapify-${
      properties.place_id ||
      properties.datasource?.raw?.osm_id ||
      `${latitude}-${longitude}`
    }`,
    source: "Geoapify",
    name,
    category,
    latitude,
    longitude,
    address:
      properties.formatted ||
      properties.address_line2 ||
      properties.address_line1 ||
      "",
    image: null,
    phone:
      properties.datasource?.raw?.phone || properties.contact?.phone || null,
    website: properties.datasource?.raw?.website || properties.website || null,
    openingHours: properties.datasource?.raw?.opening_hours || null,
    rating: properties.datasource?.raw?.rating ?? null,
    placeId: properties.place_id || null,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  };

  if (origin) {
    place.distanceMeters = distanceInMeters(origin, {
      latitude,
      longitude,
    });
  }

  return place;
}

/* GEOAPIFY CATEGORY SEARCH */

/**
 * This provider is retained as a fallback when Google cannot provide
 * enough category results.
 */
async function searchCategory(rule, origin, radius, limit, offset) {
  if (!GEOAPIFY_API_KEY) {
    throw new AppError(
      "Geoapify is not configured. Check the backend environment settings.",
      500,
    );
  }

  if (
    !rule ||
    !rule.category ||
    !Array.isArray(rule.categories) ||
    rule.categories.length === 0
  ) {
    return {
      places: [],
      providerCount: 0,
      limit,
      offset,
      hasMore: false,
      nextOffset: null,
      source: "Geoapify",
    };
  }

  const params = new URLSearchParams({
    apiKey: GEOAPIFY_API_KEY,
    categories: rule.categories.join(","),
    limit: String(Math.min(limit + offset, 100)),
    offset: String(offset),
    lang: "en",
  });

  if (origin) {
    params.set(
      "filter",
      `circle:${origin.longitude},${origin.latitude},${radius}`,
    );

    params.set("bias", `proximity:${origin.longitude},${origin.latitude}`);
  } else {
    const { south, west, north, east } = KADUNA_BOUNDS;

    params.set("filter", `rect:${west},${south},${east},${north}`);
  }

  const data = await fetchJson(`${GEOAPIFY_URL}?${params.toString()}`, {
    headers: USER_AGENT ? { "User-Agent": USER_AGENT } : undefined,
  });

  if (!Array.isArray(data.features)) {
    throw new AppError("Geoapify returned an invalid response.", 502);
  }

  const unique = new Map();

  for (const feature of data.features) {
    const place = mapGeoapifyPlace(feature, origin, rule);

    if (!place || place.name === "Unnamed place") {
      continue;
    }

    if (!isInsideRequestedRadius(place, origin, radius)) {
      continue;
    }

    unique.set(place.id, place);
  }

  let places = [...unique.values()];

  if (origin) {
    places.sort(
      (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
    );
  }

  const providerCount = places.length;
  const pagedPlaces = places.slice(offset, offset + limit);

  return {
    places: pagedPlaces,
    providerCount,
    limit,
    offset,
    hasMore: providerCount > offset + limit,
    nextOffset: providerCount > offset + limit ? offset + limit : null,
    source: "Geoapify",
  };
}

/* OPENSTREETMAP / OVERPASS FILTERING */

function isOverpassPlaceRelevant(element, category) {
  const tags = element?.tags || {};
  const allowedTags = OVERPASS_CATEGORY_TAGS[category] || [];

  if (!allowedTags.length) {
    return false;
  }

  if (FOOD_SERVICE_CATEGORIES.has(category) && isExplicitRetailBusiness(tags)) {
    return false;
  }

  if (category === "church" || category === "mosque") {
    const isPlaceOfWorship =
      normalizeCategoryValue(tags.amenity) === "place_of_worship" ||
      normalizeCategoryValue(tags.building) === "church" ||
      normalizeCategoryValue(tags.building) === "mosque";

    return (
      isPlaceOfWorship &&
      isRequestedReligiousCategory(
        {
          name: tags.name || tags["name:en"] || tags.brand,
          type: tags.building,
          religion: tags.religion,
          denomination: tags.denomination,
          alt_name: tags.alt_name,
        },
        category,
        tags,
      )
    );
  }

  return allowedTags.some(([key, value]) => {
    return normalizeCategoryValue(tags[key]) === normalizeCategoryValue(value);
  });
}

function mapOverpassPlace(element, origin, category) {
  const tags = element?.tags || {};

  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !isInsideKaduna(latitude, longitude)
  ) {
    return null;
  }

  const name = tags.name || tags["name:en"] || tags.brand;

  if (!name) {
    return null;
  }

  const address = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"],
  ]
    .filter(Boolean)
    .join(", ");

  const place = {
    id: `osm-${element.type}-${element.id}`,
    source: "OpenStreetMap",
    name,
    category,
    latitude,
    longitude,
    address,
    image: null,
    phone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || tags["contact:website"] || null,
    openingHours: tags.opening_hours || null,
    osmType: element.type,
    osmId: element.id,
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  };

  if (origin) {
    place.distanceMeters = distanceInMeters(origin, {
      latitude,
      longitude,
    });
  }

  return place;
}

/* OPENSTREETMAP OVERPASS CATEGORY SEARCH */

/**
 * This function is reserved for the Show more request.
 * It supports both GPS Nearby and statewide Kaduna searches.
 */
async function searchOverpassCategory(
  rule,
  origin,
  radius,
  limit,
  offset = 0,
  excludePlaces = [],
) {
  const category = rule?.category;
  const tags = OVERPASS_CATEGORY_TAGS[category] || [];

  if (!tags.length) {
    return {
      places: [],
      providerCount: 0,
      limit,
      offset,
      hasMore: false,
      nextOffset: null,
      source: "OpenStreetMap Overpass",
    };
  }

  const selectors = tags.map(([key, value]) => {
    if (origin) {
      return `nwr(around:${Math.round(radius)},${origin.latitude},${origin.longitude})["${key}"="${value}"];`;
    }

    const { south, west, north, east } = KADUNA_BOUNDS;

    return `nwr(${south},${west},${north},${east})["${key}"="${value}"];`;
  });

  // Keep the Overpass server-side limit aligned with the HTTP timeout.
  const query = `[out:json][timeout:7];(${selectors.join("")});out center tags;`;

  const data = await fetchJson(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      ...(USER_AGENT ? { "User-Agent": USER_AGENT } : {}),
    },
    body: new URLSearchParams({
      data: query,
    }).toString(),
    timeoutMs: 7000,
  });

  if (!Array.isArray(data.elements)) {
    throw new AppError(
      "OpenStreetMap returned an invalid category-search response.",
      502,
    );
  }

  const places = [];

  for (const element of data.elements) {
    if (!isOverpassPlaceRelevant(element, category)) {
      continue;
    }

    const place = mapOverpassPlace(element, origin, category);

    if (!place || !isInsideRequestedRadius(place, origin, radius)) {
      continue;
    }

    places.push(place);
  }

  // Compare against a deduplicated existing list instead of slicing
  // by the original exclusion-list length. The exclusion list may
  // itself contain duplicates.
  const newPlaces = getNewProviderPlaces(excludePlaces, places);
  const sorted = sortPlacesByDistance(newPlaces, origin);
  const pagedPlaces = sorted.slice(offset, offset + limit);

  return {
    places: pagedPlaces,
    providerCount: sorted.length,
    limit,
    offset,
    hasMore: sorted.length > offset + limit,
    nextOffset: sorted.length > offset + limit ? offset + limit : null,
    source: "OpenStreetMap Overpass",
  };
}

/* NOMINATIM PLACE MAPPING */

/**
 * Used for named-place Show more searches.
 * OSM tagged contact information is returned when available.
 * External images are deliberately not sourced here.
 */
function mapNominatimPlace(place, origin) {
  const latitude = Number(place.lat);
  const longitude = Number(place.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !isInsideKaduna(latitude, longitude)
  ) {
    return null;
  }

  const osmType = ["node", "way", "relation"].includes(place.osm_type)
    ? place.osm_type
    : null;

  const osmId = place.osm_id;
  const addressDetails = place.address || {};
  const extraTags = place.extratags || {};

  let category = "place";

  if (
    ["hospital", "clinic", "doctors", "pharmacy"].includes(
      addressDetails.amenity,
    )
  ) {
    category = "healthcare";
  } else if (
    ["restaurant", "fast_food", "food_court"].includes(addressDetails.amenity)
  ) {
    category = "restaurant";
  } else if (addressDetails.amenity === "cafe") {
    category = "cafe";
  } else if (addressDetails.shop === "bakery") {
    category = "bakery";
  } else if (
    ["hotel", "guest_house", "motel", "hostel"].includes(addressDetails.tourism)
  ) {
    category = "hotel";
  } else if (addressDetails.amenity === "fuel") {
    category = "filling-station";
  } else if (
    ["park", "garden", "playground"].includes(addressDetails.leisure)
  ) {
    category = "park";
  } else if (addressDetails.amenity === "place_of_worship") {
    category =
      classifyReligiousPlace(
        {
          name: place.name || place.display_name?.split(",")[0],
          religion: extraTags.religion || addressDetails.religion,
          denomination: extraTags.denomination,
          type: extraTags.building || addressDetails.building,
          alt_name: extraTags.alt_name,
        },
        extraTags,
      ) || "place";
  } else if (
    ["supermarket", "convenience", "general"].includes(addressDetails.shop)
  ) {
    category = "shopping";
  }

  const result = {
    id:
      osmType && osmId
        ? `osm-${osmType}-${osmId}`
        : `nominatim-${place.place_id || `${latitude}-${longitude}`}`,
    source: "OpenStreetMap",
    name: place.name || place.display_name?.split(",")[0] || "Unnamed place",
    category,
    latitude,
    longitude,
    address: place.display_name || "",
    image: null,
    phone: extraTags.phone || extraTags["contact:phone"] || null,
    website: extraTags.website || extraTags["contact:website"] || null,
    openingHours: extraTags.opening_hours || null,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  };

  if (osmType && osmId) {
    result.osmType = osmType;
    result.osmId = osmId;
  }

  if (origin) {
    result.distanceMeters = distanceInMeters(origin, {
      latitude,
      longitude,
    });
  }

  return result;
}

/* GOOGLE NAMED-PLACE SEARCH */

async function searchGoogleNamedPlace(query, origin, radius, limit) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new AppError("Google Places API key is not configured.", 500);
  }

  const body = {
    textQuery: /\bkaduna\b/i.test(query) ? query : `${query}, Kaduna, Nigeria`,
    pageSize: Math.min(20, Math.max(1, limit)),
  };

  if (origin) {
    body.locationBias = {
      circle: {
        center: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        },
        radius: Math.min(radius || DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS),
      },
    };
  } else {
    body.locationBias = {
      rectangle: {
        low: {
          latitude: KADUNA_BOUNDS.south,
          longitude: KADUNA_BOUNDS.west,
        },
        high: {
          latitude: KADUNA_BOUNDS.north,
          longitude: KADUNA_BOUNDS.east,
        },
      },
    };
  }

  const data = await fetchJson(GOOGLE_PLACES_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": buildGoogleFieldMask(),
    },
    body: JSON.stringify(body),
  });

  const hasPlaces = Boolean(
    data &&
    typeof data === "object" &&
    Object.prototype.hasOwnProperty.call(data, "places"),
  );

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    (hasPlaces && !Array.isArray(data.places)) ||
    (!hasPlaces && Object.keys(data).length > 0)
  ) {
    throw new AppError("Google Places returned an invalid response.", 502);
  }

  const googlePlaces = hasPlaces ? data.places : [];
  const unique = new Map();

  for (const place of googlePlaces) {
    const mapped = mapGooglePlace(place, origin, "place");

    if (!mapped || !isInsideRequestedRadius(mapped, origin, radius)) {
      continue;
    }

    unique.set(mapped.id, mapped);
  }

  const places = [...unique.values()].sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );

  return {
    places: places.slice(0, limit),
    providerCount: places.length,
    limit,
    offset: 0,
    hasMore: places.length >= Math.min(limit, 20),
    nextOffset: null,
    paginationSupported: false,
    source: "Google Places Text Search",
  };
}

/* INITIAL NAMED-PLACE SEARCH */

/**
 * Google handles the first batch.
 * OSM is not called here.
 */
async function searchNamedPlace(query, origin, radius, limit, offset = 0) {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new AppError(
      "Google Places API key is not configured for the initial named-place search.",
      500,
    );
  }

  const result = await searchGoogleNamedPlace(
    query,
    origin,
    radius,
    Math.min(20, MAX_RESULTS_LIMIT, Math.max(1, Number(limit) || 8)),
  );

  return {
    ...result,
    places: result.places.slice(offset, offset + limit),
    offset,
  };
}

/* OSM NAMED-PLACE SHOW MORE */

/**
 * Nominatim does not provide reliable offset pagination.
 * We request a bounded result set and exclude places already returned
 * by earlier batches.
 */
async function searchOsmNamedPlaceBatch(
  query,
  origin,
  radius,
  limit = 8,
  excludePlaces = [],
) {
  const safeLimit = Math.min(8, Math.max(1, Number(limit) || 8));

  const params = new URLSearchParams({
    q: /\bkaduna\b/i.test(query) ? query : `${query}, Kaduna, Nigeria`,
    format: "jsonv2",
    addressdetails: "1",
    extratags: "1",
    limit: "40",
    countrycodes: "ng",
    viewbox: [
      KADUNA_BOUNDS.west,
      KADUNA_BOUNDS.north,
      KADUNA_BOUNDS.east,
      KADUNA_BOUNDS.south,
    ].join(","),
    bounded: "1",
  });

  const results = await fetchJson(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: USER_AGENT ? { "User-Agent": USER_AGENT } : undefined,
    timeoutMs: 7000,
  });

  if (!Array.isArray(results)) {
    throw new AppError(
      "OpenStreetMap returned an invalid named-place response.",
      502,
    );
  }

  let places = results
    .map((place) => mapNominatimPlace(place, origin))
    .filter(Boolean);

  if (origin) {
    places = places.filter((place) => place.distanceMeters <= radius);
    places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  // Exclude earlier results without assuming the exclusion list
  // is already unique.
  const newPlaces = getNewProviderPlaces(excludePlaces, places);

  return {
    places: newPlaces.slice(0, safeLimit),
    providerCount: newPlaces.length,
    limit: safeLimit,
    offset: 0,
    hasMore: newPlaces.length > safeLimit,
    nextOffset: null,
    paginationSupported: false,
    source: "OpenStreetMap",
  };
}

/* PROVIDER DEDUPLICATION */

function normalizePlaceName(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getPlaceStableIds(place) {
  return [
    place?.placeId,
    place?.id,
    place?.osmUrl,
    place?.osmType && place?.osmId
      ? `osm-${place.osmType}-${place.osmId}`
      : null,
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

function getNameSimilarity(a, b) {
  const left = normalizePlaceName(a);
  const right = normalizePlaceName(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftTokens = new Set(left.split(" ").filter((word) => word.length > 1));
  const rightTokens = new Set(
    right.split(" ").filter((word) => word.length > 1),
  );

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let intersection = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection++;
    }
  }

  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

function deduplicateProviderPlaces(places) {
  const result = [];
  const idToIndex = new Map();

  for (const place of places) {
    if (
      !place ||
      !Number.isFinite(Number(place.latitude)) ||
      !Number.isFinite(Number(place.longitude))
    ) {
      continue;
    }

    const ids = getPlaceStableIds(place);

    const stableMatch = ids
      .map((id) => idToIndex.get(id))
      .find((index) => index !== undefined);

    const duplicateIndex =
      stableMatch !== undefined
        ? stableMatch
        : result.findIndex((existing) => {
            const distance = distanceInMeters(
              {
                latitude: Number(place.latitude),
                longitude: Number(place.longitude),
              },
              {
                latitude: Number(existing.latitude),
                longitude: Number(existing.longitude),
              },
            );

            const similarity = getNameSimilarity(place.name, existing.name);

            return (
              (similarity === 1 && distance <= 100) ||
              (similarity >= 0.88 && distance <= 45)
            );
          });

    if (duplicateIndex >= 0) {
      const existing = result[duplicateIndex];

      if (!existing.image && place.image) {
        existing.image = place.image;
      }

      if (!existing.address && place.address) {
        existing.address = place.address;
      }

      if (!existing.phone && place.phone) {
        existing.phone = place.phone;
      }

      if (!existing.website && place.website) {
        existing.website = place.website;
      }

      if (!existing.openingHours && place.openingHours) {
        existing.openingHours = place.openingHours;
      }

      existing.sources = [
        ...new Set([...(existing.sources || [existing.source]), place.source]),
      ].filter(Boolean);

      for (const id of ids) {
        idToIndex.set(id, duplicateIndex);
      }

      continue;
    }

    result.push({
      ...place,
      sources: [
        ...new Set([...(place.sources || []), place.source].filter(Boolean)),
      ],
    });

    const resultIndex = result.length - 1;

    for (const id of ids) {
      idToIndex.set(id, resultIndex);
    }
  }

  return result;
}

/**
 * Determines whether 2 provider records represent the same place.
 *
 * Stable provider IDs are checked first. If no stable ID matches,
 * name similarity and geographic distance are used.
 */
function areProviderPlacesDuplicates(place, existing) {
  const placeIds = getPlaceStableIds(place);
  const existingIds = new Set(getPlaceStableIds(existing));

  if (placeIds.some((id) => existingIds.has(id))) {
    return true;
  }

  const latitudeA = Number(place?.latitude);
  const longitudeA = Number(place?.longitude);
  const latitudeB = Number(existing?.latitude);
  const longitudeB = Number(existing?.longitude);

  if (![latitudeA, longitudeA, latitudeB, longitudeB].every(Number.isFinite)) {
    return false;
  }

  const distance = distanceInMeters(
    { latitude: latitudeA, longitude: longitudeA },
    { latitude: latitudeB, longitude: longitudeB },
  );

  const similarity = getNameSimilarity(place?.name, existing?.name);

  return (
    (similarity === 1 && distance <= 100) ||
    (similarity >= 0.88 && distance <= 45)
  );
}

/**
 * Returns only genuinely new provider records.
 *
 * Both lists are deduplicated independently. This avoids the previous
 * array-length slicing bug when the exclusion list already contains
 * duplicate records.
 */
function getNewProviderPlaces(existingPlaces, candidatePlaces) {
  const existing = deduplicateProviderPlaces(
    Array.isArray(existingPlaces) ? existingPlaces : [],
  );

  const candidates = deduplicateProviderPlaces(
    Array.isArray(candidatePlaces) ? candidatePlaces : [],
  );

  const newPlaces = [];

  for (const candidate of candidates) {
    const alreadyExists = existing.some((place) =>
      areProviderPlacesDuplicates(candidate, place),
    );

    const alreadyAdded = newPlaces.some((place) =>
      areProviderPlacesDuplicates(candidate, place),
    );

    if (!alreadyExists && !alreadyAdded) {
      newPlaces.push(candidate);
    }
  }

  return newPlaces;
}

function sortPlacesByDistance(places, origin) {
  return [...places].sort((a, b) => {
    if (origin) {
      return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

/* PROGRESSIVE CATEGORY SEARCH */

/**
 * Initial search:
 * 1. Google Nearby when GPS is supplied.
 * 2. Google Text Search for statewide Kaduna search.
 * 3. Geoapify only if Google fails or cannot fill the first batch.
 *
 * OSM is deliberately not called here.
 * The controller calls searchOverpassCategory() after Show more.
 */
async function searchCategoryWithFallbacks(options = {}) {
  const { rule, origin, radius, limit, offset = 0 } = options;

  if (!rule?.category) {
    throw new AppError("A valid search category is required.", 400);
  }

  const requestedLimit = Math.min(
    100,
    MAX_RESULTS_LIMIT,
    Math.max(1, Number(limit) || 8),
  );

  const requestedOffset = Math.max(0, Number(offset) || 0);

  let googleResult = null;
  let googleError = null;

  // Google is the initial provider. Nearby uses GPS; statewide uses Kaduna bounds.
  if (GOOGLE_PLACES_API_KEY) {
    try {
      googleResult = origin
        ? await searchGooglePlacesCategory(
            rule,
            origin,
            radius,
            requestedLimit + requestedOffset,
            0,
          )
        : await searchGooglePlacesTextCategory(
            rule,
            null,
            radius,
            requestedLimit + requestedOffset,
            0,
          );
    } catch (error) {
      googleError = error;

      console.error(
        "[Kaduna Explorer] Google category search failed:",
        error.message,
      );
    }
  }

  const googlePlaces = googleResult?.places || [];
  let merged = deduplicateProviderPlaces(googlePlaces);

  let geoapifyResult = null;
  let geoapifyError = null;

  // Geoapify is a fallback, not a parallel request on every search.
  if (merged.length < requestedLimit + requestedOffset && GEOAPIFY_API_KEY) {
    try {
      geoapifyResult = await searchCategory(
        rule,
        origin,
        radius,
        Math.min(100, requestedLimit + requestedOffset + 8),
        0,
      );

      merged = deduplicateProviderPlaces([
        ...googlePlaces,
        ...(geoapifyResult?.places || []),
      ]);
    } catch (error) {
      geoapifyError = error;

      console.error(
        "[Kaduna Explorer] Geoapify fallback failed:",
        error.message,
      );
    }
  }

  if (!googleResult && !geoapifyResult) {
    throw (
      googleError ||
      geoapifyError ||
      new AppError(
        "Category search is unavailable. Check your provider API settings.",
        502,
      )
    );
  }

  const sorted = sortPlacesByDistance(merged, origin);

  const page = sorted.slice(requestedOffset, requestedOffset + requestedLimit);

  const providerSources = [
    ...(googlePlaces.length ? [googleResult.source] : []),
    ...(geoapifyResult?.places?.length ? [geoapifyResult.source] : []),
  ].filter(Boolean);

  const errors = {};

  if (googleError) {
    errors.google = googleError.message;
  }

  if (geoapifyError) {
    errors.geoapify = geoapifyError.message;
  }

  return {
    places: page,
    providerCount: sorted.length,
    providerCounts: {
      google: googlePlaces.length,
      geoapify: geoapifyResult?.places?.length || 0,
    },
    providerSources,
    limit: requestedLimit,
    offset: requestedOffset,
    hasMore: false,
    nextOffset: null,
    paginationSupported: false,
    source: providerSources.join(" + ") || "Place providers",
    errors,
  };
}

module.exports = {
  distanceInMeters,
  mapGooglePlace,
  mapGooglePlacesResponse,
  isGooglePlaceRelevant,
  classifyReligiousPlace,
  searchGooglePlacesCategory,
  searchGooglePlacesTextCategory,
  searchGoogleNamedPlace,
  mapGeoapifyPlace,
  isGeoapifyPlaceRelevant,
  searchCategory,
  mapOverpassPlace,
  isOverpassPlaceRelevant,
  searchOverpassCategory,
  mapNominatimPlace,
  searchNamedPlace,
  searchOsmNamedPlaceBatch,
  searchCategoryWithFallbacks,
};

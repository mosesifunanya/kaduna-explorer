export const NEARBY_CATEGORIES = [
  "restaurants",
  "hotels",
  "hospitals",
  "parks",
  "fuel stations",
  "tourist attractions",
  "shopping",
  "banks",
  "transport",
];

export const PLACES_PER_PAGE = 8;

export function extractDestination(response) {
  const candidates = [
    response?.data?.destination,
    response?.data?.data?.destination,
    response?.destination,
    response?.data?.data,
    response?.data,
    response,
  ];

  return (
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (item._id || item.id || item.slug || item.name),
    ) ?? null
  );
}

export function extractDestinations(response) {
  const candidates = [
    response?.data?.destinations,
    response?.data?.data?.destinations,
    response?.destinations,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) ?? null;
}

export function extractPlaces(response) {
  const candidates = [
    response?.data?.places,
    response?.data?.data?.places,
    response?.places,
    response?.data?.results,
    response?.data?.data?.results,
    response?.results,
    response?.data?.data,
    response?.data,
  ];

  return candidates.find(Array.isArray) ?? [];
}

export function getIdentifier(destination) {
  return String(destination?.slug || destination?.id || destination?._id || "");
}

export function getCoverImage(destination) {
  const cover = destination?.coverImage;

  if (typeof cover === "string" && cover.trim()) {
    return cover.trim();
  }

  if (typeof cover?.url === "string" && cover.url.trim()) {
    return cover.url.trim();
  }

  const firstImage = destination?.images?.[0];

  if (typeof firstImage === "string") return firstImage;
  if (typeof firstImage?.url === "string") return firstImage.url;
  if (typeof firstImage?.secure_url === "string") {
    return firstImage.secure_url;
  }

  return "";
}

export function getImageUrl(image) {
  if (typeof image === "string") return image;
  if (typeof image?.url === "string") return image.url;
  if (typeof image?.secure_url === "string") return image.secure_url;

  return "";
}

export function getGallery(destination) {
  const source = Array.isArray(destination?.images) ? destination.images : [];
  const images = source.map(getImageUrl).filter(Boolean);
  const cover = getCoverImage(destination);

  return [...new Set([cover, ...images].filter(Boolean))];
}

export function getLocation(destination) {
  const values = [
    destination?.address,
    destination?.lga,
    destination?.city,
    destination?.state,
  ].filter((value) => typeof value === "string" && value.trim());

  return [...new Set(values)].join(", ") || "Kaduna State, Nigeria";
}

export function getRelatedHref(destination) {
  const identifier = getIdentifier(destination);

  return identifier ? `/explore/${encodeURIComponent(identifier)}` : "/explore";
}

export function getWebsiteUrl(website) {
  if (!website || typeof website !== "string") return "";

  const trimmed = website.trim();

  if (!trimmed) return "";

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getCoordinates(destination) {
  const coordinates = destination?.location?.coordinates;

  // GeoJSON coordinates are stored as [longitude, latitude].
  if (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  ) {
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  const latitude = Number(
    destination?.latitude ?? destination?.location?.latitude,
  );

  const longitude = Number(
    destination?.longitude ?? destination?.location?.longitude,
  );

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { latitude, longitude };
  }

  return null;
}

export function distanceInMeters(a, b) {
  if (
    !a ||
    !b ||
    !Number.isFinite(Number(a.latitude)) ||
    !Number.isFinite(Number(a.longitude)) ||
    !Number.isFinite(Number(b.latitude)) ||
    !Number.isFinite(Number(b.longitude))
  ) {
    return Infinity;
  }

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

export function normalizePlaceName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function deduplicateNearbyPlaces(places, destination) {
  const destinationId = String(
    destination?._id || destination?.id || "",
  ).trim();

  const destinationSlug = normalizePlaceName(destination?.slug);
  const destinationName = normalizePlaceName(destination?.name);
  const destinationCoordinates = getCoordinates(destination);

  const seenIds = new Set();
  const seenNames = new Map();
  const uniquePlaces = [];

  for (const place of places) {
    const placeId = String(
      place?.destinationId || place?.destination?._id || place?._id || "",
    ).trim();

    const placeSlug = normalizePlaceName(place?.slug || place?.destinationSlug);
    const placeName = normalizePlaceName(place?.name);

    // Exclude the destination currently open in this page.
    if (
      (destinationId && placeId && placeId === destinationId) ||
      (destinationSlug && placeSlug && placeSlug === destinationSlug)
    ) {
      continue;
    }

    // Exclude the same named destination when its coordinates match closely.
    if (
      destinationName &&
      placeName === destinationName &&
      destinationCoordinates &&
      distanceInMeters(destinationCoordinates, place) <= 100
    ) {
      continue;
    }

    const stableId = String(
      place?.placeId ||
        place?.place_id ||
        place?.googlePlaceId ||
        place?.osmId ||
        place?.id ||
        "",
    ).trim();

    if (stableId && seenIds.has(stableId)) {
      continue;
    }

    // Same normalized name within 60 metres is treated as the same place.
    // Separate branches farther apart are retained.
    const sameNamePlaces = placeName ? seenNames.get(placeName) || [] : [];

    const duplicateByName = sameNamePlaces.some(
      (previous) => distanceInMeters(previous, place) <= 60,
    );

    if (duplicateByName) {
      continue;
    }

    if (stableId) {
      seenIds.add(stableId);
    }

    if (placeName) {
      seenNames.set(placeName, [...sameNamePlaces, place]);
    }

    uniquePlaces.push(place);
  }

  return uniquePlaces;
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return "";

  return meters < 1000
    ? `${Math.round(meters)} m away`
    : `${(meters / 1000).toFixed(1)} km away`;
}

export function getDirectionsUrl(place) {
  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  return typeof place?.directionsUrl === "string" &&
    /^https:\/\/www\.google\.com\/maps\//i.test(place.directionsUrl)
    ? place.directionsUrl
    : "";
}

export function isFamilyFriendlyPlace(place) {
  const text = [place?.name, place?.category, place?.address]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const restrictedTerms =
    /\b(strip club|nightclub|night club|brothel|adult entertainment|sex shop|pornography|gentlemen'?s club)\b/i;

  return !restrictedTerms.test(text);
}

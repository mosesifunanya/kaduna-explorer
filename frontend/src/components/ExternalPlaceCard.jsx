"use client";

import { useEffect, useState } from "react";

import {
  ArrowUpRight,
  ExternalLink,
  MapPin,
  Navigation,
  Clock,
  Star,
} from "lucide-react";

function getPlaceName(place) {
  const value =
    place?.name ??
    place?.displayName?.text ??
    place?.displayName ??
    place?.properties?.name ??
    place?.properties?.address_line1 ??
    "Nearby place";

  return typeof value === "string" ? value : "Nearby place";
}

function formatCategory(value) {
  if (typeof value !== "string" || !value.trim()) return "Place";

  return value
    .replace(/[\\\_-]/g, " ")
    .split(".")
    .pop()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPlaceCategory(place) {
  const value =
    place?.category ??
    place?.primaryTypeDisplayName?.text ??
    place?.primaryType ??
    place?.properties?.categories?.[0] ??
    place?.types?.[0] ??
    "Place";

  return formatCategory(Array.isArray(value) ? (value[0] ?? "Place") : value);
}

function getPlaceAddress(place) {
  const value =
    place?.address ??
    place?.formattedAddress ??
    place?.vicinity ??
    place?.properties?.formatted ??
    place?.properties?.address_line1 ??
    place?.properties?.address_line2 ??
    "";

  return typeof value === "string" ? value : "";
}

function getPlaceCoordinates(place) {
  const latitude =
    place?.latitude ??
    place?.lat ??
    place?.location?.latitude ??
    place?.geometry?.location?.lat ??
    place?.properties?.lat ??
    place?.properties?.latitude;

  const longitude =
    place?.longitude ??
    place?.lon ??
    place?.lng ??
    place?.location?.longitude ??
    place?.geometry?.location?.lng ??
    place?.properties?.lon ??
    place?.properties?.longitude;

  if (
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    String(latitude).trim() !== "" &&
    String(longitude).trim() !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude))
  ) {
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: lat, longitude: lon };
    }
  }

  const coordinates =
    place?.location?.coordinates ??
    place?.geometry?.coordinates ??
    place?.coordinates;

  if (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  ) {
    const longitudeValue = Number(coordinates[0]);
    const latitudeValue = Number(coordinates[1]);

    if (
      latitudeValue >= -90 &&
      latitudeValue <= 90 &&
      longitudeValue >= -180 &&
      longitudeValue <= 180
    ) {
      return {
        longitude: longitudeValue,
        latitude: latitudeValue,
      };
    }
  }

  return null;
}

function getSafeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function getPlaceImage(place) {
  // External search cards may display only DuckDuckGo Images results.
  const imageSource = String(
    place?.imageSource ?? place?.properties?.imageSource ?? "",
  ).toLowerCase();

  if (!imageSource.includes("duckduckgo")) return null;

  const candidates = [
    place?.image,
    place?.imageUrl,
    place?.photoUrl,
    place?.photo,
    place?.properties?.image,
    place?.properties?.image_url,
  ];

  for (const candidate of candidates) {
    const url = getSafeHttpUrl(
      typeof candidate === "string" ? candidate : candidate?.url,
    );

    if (url) return url;
  }

  return null;
}

/**
 * Select a neutral illustration based on the place name and category.
 * Images are served from frontend/public/assets/images/placeholders/.
 */
function getPlacePlaceholder(place) {
  const categories = [
    getPlaceName(place),
    getPlaceCategory(place),
    ...(Array.isArray(place?.types) ? place.types : []),
    ...(Array.isArray(place?.properties?.categories)
      ? place.properties.categories
      : []),
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase()
    .replace(/[\\\_-]+/g, " ");

  const placeholders = [
    {
      keywords: [
        "beauty",
        "personal care",
        "salon",
        "hairdresser",
        "hair salon",
        "barber",
        "spa",
        "cosmetic",
        "skincare",
        "nail salon",
      ],
      image: "kaduna-explorer-beauty-personal-care-placeholder.png",
    },
    {
      keywords: [
        "phone repair",
        "mobile phone repair",
        "computer repair",
        "electronics repair",
        "repair shop",
        "technical service",
        "technician",
        "phone shop",
        "mobile phone store",
      ],
      image: "kaduna-explorer-repairs-technical-phone-placeholder.png",
    },
    {
      keywords: [
        "professional service",
        "business service",
        "consulting",
        "accountant",
        "accounting",
        "lawyer",
        "law firm",
        "consultant",
        "business office",
      ],
      image: "kaduna-explorer-professional-business-services-placeholder.png",
    },
    {
      keywords: ["mosque", "masjid"],
      image: "kaduna-explorer-mosques-placeholder.png",
    },
    {
      keywords: ["church", "chapel", "christian", "place of worship"],
      image: "kaduna-explorer-churches-religious-placeholder.png",
    },
    {
      keywords: [
        "hospital",
        "clinic",
        "healthcare",
        "medical centre",
        "medical center",
        "doctor",
        "pharmacy",
        "dentist",
      ],
      image: "kaduna-explorer-hospitals-healthcare-placeholder.png",
    },
    {
      keywords: [
        "hotel",
        "motel",
        "guest house",
        "guesthouse",
        "lodge",
        "accommodation",
        "resort",
      ],
      image: "kaduna-explorer-hotels-accommodation-placeholder.png",
    },
    {
      keywords: [
        "restaurant",
        "cafe",
        "coffee shop",
        "fast food",
        "food",
        "eatery",
        "buka",
        "barbecue",
      ],
      image: "kaduna-explorer-restaurants-food-placeholder.png",
    },
    {
      keywords: [
        "fuel station",
        "petrol station",
        "gas station",
        "filling station",
        "petroleum",
      ],
      image: "kaduna-explorer-fuel-stations-placeholder.png",
    },
    {
      keywords: [
        "market",
        "shopping",
        "supermarket",
        "mall",
        "store",
        "shop",
        "boutique",
      ],
      image: "kaduna-explorer-markets-shopping-placeholder.png",
    },
    {
      keywords: [
        "tourist attraction",
        "waterfall",
        "mountain",
        "hill",
        "tourism",
        "park",
        "museum",
        "castle",
        "landmark",
        "nature reserve",
      ],
      image: "kaduna-explorer-tourist-attractions-placeholder.png",
    },
  ];

  const match = placeholders.find(({ keywords }) =>
    keywords.some((keyword) => categories.includes(keyword)),
  );

  const filename =
    match?.image ?? "kaduna-explorer-general-other-placeholder.png";

  return `/assets/images/placeholders/${filename}`;
}

function getDistanceLabel(place) {
  const distance = Number(
    place?.distanceMeters ?? place?.distance ?? place?.properties?.distance,
  );

  if (!Number.isFinite(distance) || distance < 0) return null;

  if (distance < 1000) return `${Math.round(distance)} m away`;

  return `${(distance / 1000).toFixed(1)} km away`;
}

/**
 * Keep opening hours compact.
 * Long weekly schedules are shortened instead of stretching the card.
 */
function getOpeningHours(place) {
  const hours =
    place?.openingHours ??
    place?.opening_hours ??
    place?.currentOpeningHours ??
    place?.properties?.opening_hours;

  const compactText = (value) => {
    const text = String(value || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return null;

    return text.length > 88 ? `${text.slice(0, 85).trimEnd()}…` : text;
  };

  if (typeof hours === "string") {
    return compactText(hours);
  }

  if (Array.isArray(hours)) {
    return compactText(hours.filter(Boolean).join(" · "));
  }

  if (hours && typeof hours === "object") {
    if (typeof hours.openNow === "boolean") {
      return hours.openNow ? "Currently open" : "Currently closed";
    }

    if (typeof hours.open_now === "boolean") {
      return hours.open_now ? "Currently open" : "Currently closed";
    }

    if (typeof hours.weekday_text?.[0] === "string") {
      return compactText(hours.weekday_text[0]);
    }
  }

  if (typeof place?.openNow === "boolean") {
    return place.openNow ? "Currently open" : "Currently closed";
  }

  if (typeof place?.opening_hours?.open_now === "boolean") {
    return place.opening_hours.open_now ? "Currently open" : "Currently closed";
  }

  return null;
}

function getRating(place) {
  const value = place?.rating ?? place?.properties?.rating ?? place?.userRating;

  if (value === null || value === undefined || value === "") return null;

  const rating = Number(value);

  return Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : null;
}

function getDirectionsUrl(place, coordinates) {
  const providedUrl = getSafeHttpUrl(place?.directionsUrl);

  if (providedUrl) return providedUrl;

  if (coordinates) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
  }

  const query = [getPlaceName(place), getPlaceAddress(place)]
    .filter(Boolean)
    .join(", ");

  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
    : null;
}

function getSourceUrl(place) {
  const candidates = [
    place?.sourceUrl,
    place?.website,
    place?.websiteUri,
    place?.url,
    place?.properties?.website,
  ];

  for (const candidate of candidates) {
    const url = getSafeHttpUrl(candidate);

    if (url) return url;
  }

  const osmType = place?.osmType ?? place?.properties?.osm_type;
  const osmId = place?.osmId ?? place?.properties?.osm_id;

  if (
    osmId &&
    typeof osmType === "string" &&
    ["node", "way", "relation"].includes(osmType.toLowerCase())
  ) {
    return `https://www.openstreetmap.org/${osmType.toLowerCase()}/${encodeURIComponent(osmId)}`;
  }

  return null;
}

export default function ExternalPlaceCard({ place = {} }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const name = getPlaceName(place);
  const category = getPlaceCategory(place);
  const address = getPlaceAddress(place);
  const coordinates = getPlaceCoordinates(place);
  const image = getPlaceImage(place);
  const imageSource =
    place?.imageSource ?? place?.properties?.imageSource ?? "";
  const imageStatus = place?.imageStatus ?? (image ? "loaded" : "unavailable");
  const placeholder = getPlacePlaceholder(place);
  const distance = getDistanceLabel(place);
  const openingHours = getOpeningHours(place);
  const rating = getRating(place);
  const directionsUrl = getDirectionsUrl(place, coordinates);
  const sourceUrl = getSourceUrl(place);

  // Reset image state when React reuses this card for another place or image.
  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [image, imageSource, imageStatus, placeholder]);

  const isOpen =
    place?.openNow ??
    place?.opening_hours?.open_now ??
    place?.openingHours?.openNow ??
    place?.openingHours?.open_now ??
    null;

  const isImageLoading =
    !imageFailed &&
    (place?.imageStatus === "loading" || (image && !imageLoaded));

  const showRemoteImage =
    Boolean(image) && imageStatus !== "unavailable" && !imageFailed;

  const showCategoryPlaceholder =
    (!showRemoteImage || imageFailed) && !isImageLoading;

  return (
    <article className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#E2EAE3] bg-white shadow-[0_2px_6px_rgba(25,60,39,0.06)] transition duration-200 hover:border-[#B7CCB9] hover:shadow-[0_5px_14px_rgba(25,60,39,0.10)] sm:rounded-2xl">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#EDF3ED]">
        {isImageLoading && (
          <div
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#E8EEE8] via-[#F4F7F3] to-[#E8EEE8]"
            aria-label="Loading place image"
            role="status"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-9 w-9 rounded-full border border-[#D5E1D5] bg-white/50" />
            </div>
          </div>
        )}

        {showRemoteImage && (
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageFailed(true);
              setImageLoaded(false);
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:scale-[1.03] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {showCategoryPlaceholder && (
          <img
            src={placeholder}
            alt={`${category} illustration, not an actual photo of ${name}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <span className="absolute left-2 top-2 max-w-[75%] truncate rounded-full border border-white/70 bg-white/95 px-2 py-1 text-[9px] font-bold leading-tight text-[#254A32] shadow-sm sm:left-2.5 sm:top-2.5 sm:px-2.5 sm:text-[10px]">
          {category}
        </span>

        {distance && (
          <span className="absolute bottom-2 right-2 flex max-w-[80%] items-center gap-1 rounded-full bg-[#173D29]/95 px-2 py-1 text-[9px] font-semibold leading-tight text-white shadow-sm sm:bottom-2.5 sm:right-2.5 sm:px-2.5 sm:text-[10px]">
            <MapPin size={11} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{distance}</span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-[clamp(6px,2.3vw,14px)]">
        <div className="flex min-w-0 items-start justify-between gap-1">
          <h3 className="line-clamp-2 min-w-0 flex-1 break-words text-[clamp(11px,3vw,14px)] font-bold leading-snug text-[#193C27]">
            {name}
          </h3>

          {rating !== null && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF7E5] px-1.5 py-1 text-[9px] font-bold leading-none text-[#8A6415] sm:px-2 sm:text-[10px]">
              <Star
                size={10}
                fill="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        {address && (
          <p className="mt-1.5 flex min-w-0 items-start gap-1 text-[clamp(9px,2.5vw,11px)] leading-[1.45] text-[#6B786D] sm:mt-2 sm:gap-1.5">
            <MapPin
              size={12}
              className="mt-0.5 shrink-0 text-[#68846C]"
              aria-hidden="true"
            />
            <span className="line-clamp-2 min-w-0 break-words">{address}</span>
          </p>
        )}

        {openingHours && (
          <p className="mt-1.5 flex min-w-0 items-start gap-1 text-[10px] leading-[1.45] text-[#68766B] sm:mt-2 sm:gap-1.5">
            <Clock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 min-w-0 break-words">
              {openingHours}
            </span>
          </p>
        )}

        {typeof isOpen === "boolean" && (
          <span
            className={`mt-2 inline-flex max-w-full items-center gap-1.5 self-start rounded-full px-2 py-1 text-[9px] font-semibold ${
              isOpen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isOpen ? "bg-green-600" : "bg-red-500"
              }`}
            />
            {isOpen ? "Open now" : "Closed now"}
          </span>
        )}

        <div
          className={`mt-auto grid min-w-0 gap-1.5 pt-3 sm:gap-2 sm:pt-4 ${
            directionsUrl && sourceUrl ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open directions to ${name}`}
              title={`Open directions to ${name}`}
              className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg bg-[#285D3B] px-1.5 py-2 text-[10px] font-bold leading-none text-white transition hover:bg-[#19472B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285D3B] sm:min-h-10 sm:gap-1.5 sm:px-2.5 sm:text-xs"
            >
              <Navigation size={13} className="shrink-0" aria-hidden="true" />

              <span className="hidden sm:inline">Directions</span>
              <span className="sm:hidden">Map</span>

              <ArrowUpRight
                size={11}
                className="hidden shrink-0 sm:block"
                aria-hidden="true"
              />
            </a>
          )}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View details for ${name}`}
              title={`View details for ${name}`}
              className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-[#DCE6DC] bg-[#FAFCFA] px-1.5 py-2 text-[10px] font-semibold leading-none text-[#31553A] transition hover:border-[#B7CCB9] hover:bg-[#F0F5EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285D3B] sm:min-h-10 sm:gap-1.5 sm:px-2.5 sm:text-xs"
            >
              <ExternalLink size={11} className="shrink-0" aria-hidden="true" />

              <span className="truncate">
                <span className="hidden sm:inline">View details</span>
                <span className="sm:hidden">Details</span>
              </span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

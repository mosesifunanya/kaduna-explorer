const AppError = require("./appError");

const BLOCKED_SEARCH_TERMS = [
  /\bporn(?:ography|ographic)?\b/i,
  /\bxxx\b/i,
  /\bhentai\b/i,
  /\berotica\b/i,
  /\badult\s+(?:content|videos?|sites?|websites?|entertainment)\b/i,
  /\bsex\s+(?:videos?|sites?|websites?|chat|cams?|workers?|services?|toys?|shops?|clubs?)\b/i,
  /\bexplicit\s+sexual\s+content\b/i,
  /\bstrip\s*clubs?\b/i,
  /\bprostitut(?:e|es|ion)\b/i,
  /\bescorts?\b/i,
  /\bcall\s*girls?\b/i,
  /\bsexual\s+services?\b/i,
  /\bsex\s+dolls?\b/i,
  /\badult\s+toys?\b/i,
];

const ADULT_RESULT_TERMS = [
  /\bporn(?:ography|ographic)?\b/i,
  /\bxxx\b/i,
  /\bhentai\b/i,
  /\berotica\b/i,
  /\badult\s+(?:content|videos?|sites?|websites?|entertainment)\b/i,
  /\bstrip\s*clubs?\b/i,
  /\bsex\s+(?:videos?|shops?|toys?|dolls?|cams?|workers?)\b/i,
  /\bprostitut(?:e|es|ion)\b/i,
  /\bescort\s+services?\b/i,
  /\bcall\s*girls?\b/i,
  /\bsexual\s+services?\b/i,
];

function isBlockedAdultQuery(query) {
  const value = String(query || "").trim();

  return BLOCKED_SEARCH_TERMS.some((pattern) => pattern.test(value));
}

function assertSafeSearchQuery(query) {
  if (isBlockedAdultQuery(query)) {
    throw new AppError(
      "This search is not supported. Search for tourism, local businesses, and general services instead.",
      400,
    );
  }
}

function isAdultResult(place) {
  if (!place || typeof place !== "object") {
    return false;
  }

  const tags = place.tags || place.properties?.datasource?.raw || {};

  const adultFlag = String(
    tags.adult ?? tags.adult_content ?? tags.adultContent ?? "",
  ).toLowerCase();

  if (["yes", "true", "1"].includes(adultFlag)) {
    return true;
  }

  const shop = String(tags.shop || "").toLowerCase();
  const amenity = String(tags.amenity || "").toLowerCase();
  const club = String(tags.club || "").toLowerCase();

  const category = String(
    place.category ||
      place.categories?.join?.(" ") ||
      place.properties?.category ||
      "",
  ).toLowerCase();

  if (
    ["erotic", "sex_shop"].includes(shop) ||
    ["stripclub", "brothel"].includes(amenity) ||
    club === "stripclub" ||
    /adult|porn|erotic|stripclub|sex_shop|brothel/.test(category)
  ) {
    return true;
  }

  const searchableText = [
    place.name,
    place.displayName,
    place.display_name,
    place.address,
    place.description,
    place.website,
    place.url,
    place.category,
    ...(Array.isArray(place.categories) ? place.categories : []),
    place.properties?.name,
    place.properties?.address_line1,
    place.properties?.address_line2,
    place.properties?.formatted,
  ]
    .filter(Boolean)
    .join(" ");

  return ADULT_RESULT_TERMS.some((pattern) => pattern.test(searchableText));
}

function filterSafePlaces(places) {
  if (!Array.isArray(places)) {
    return [];
  }

  return places.filter((place) => !isAdultResult(place));
}

module.exports = {
  isBlockedAdultQuery,
  assertSafeSearchQuery,
  isAdultResult,
  filterSafePlaces,
};

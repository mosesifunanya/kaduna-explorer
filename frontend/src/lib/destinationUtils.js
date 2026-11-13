const colors = [
  "from-emerald-950 via-green-800 to-lime-500",
  "from-amber-950 via-orange-800 to-yellow-500",
  "from-cyan-950 via-teal-800 to-cyan-500",
  "from-red-950 via-red-800 to-orange-500",
  "from-green-950 via-emerald-800 to-lime-500",
  "from-slate-950 via-slate-800 to-slate-500",
];

function getDestinationKey(destination = {}) {
  const value =
    destination.slug ||
    destination.id ||
    destination._id ||
    destination.name ||
    "";

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCoverImage(destination = {}) {
  const coverImage = destination.coverImage;

  if (typeof coverImage === "string") {
    return coverImage.trim();
  }

  if (typeof coverImage?.url === "string") {
    return coverImage.url.trim();
  }

  return "";
}

function getLocationLabel(destination = {}) {
  if (typeof destination.location === "string") {
    const readableLocation = destination.location.trim();

    if (readableLocation) return readableLocation;
  }

  const locationParts = [
    destination.address,
    destination.lga,
    destination.city,
    destination.state,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());

  return [...new Set(locationParts)].join(", ") || "Kaduna State";
}

function formatCategory(category) {
  return String(category || "other")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeDestination(destination = {}, index = 0) {
  const name = destination.name || "Unnamed destination";
  const category = destination.category || "other";
  const coverImage = getCoverImage(destination);

  return {
    ...destination,

    id:
      destination.id ||
      destination.slug ||
      destination._id ||
      getDestinationKey({ name }),

    name,
    image: coverImage,
    coverImage,
    locationLabel: getLocationLabel(destination),
    category,
    categoryLabel: formatCategory(destination.categoryLabel || category),
    color: colors[index % colors.length],
    number: String(index + 1).padStart(2, "0"),
  };
}

export function mergeDestinations(
  apiDestinations = [],
  featuredDestinations = [],
) {
  const apiByKey = new Map();

  for (const destination of apiDestinations) {
    const key = getDestinationKey(destination);

    if (key) {
      apiByKey.set(key, destination);
    }
  }

  const orderedKeys = [
    ...new Set(featuredDestinations.map(getDestinationKey).filter(Boolean)),
  ];

  const featured = orderedKeys.map((key) => apiByKey.get(key)).filter(Boolean);

  const featuredKeySet = new Set(
    featured.map(getDestinationKey).filter(Boolean),
  );

  const additional = apiDestinations.filter((destination) => {
    const key = getDestinationKey(destination);

    return !key || !featuredKeySet.has(key);
  });

  return [...featured, ...additional].map((destination, index) =>
    normalizeDestination(destination, index),
  );
}

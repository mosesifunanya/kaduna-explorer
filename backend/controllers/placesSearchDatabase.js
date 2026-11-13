const Destination = require("../models/destinationModel");

const {
  normalizeText,
  DEFAULT_RESULTS_LIMIT,
  MAX_RESULTS_LIMIT,
} = require("./placesSearchConfig");

const { classifyReligiousPlace } = require("./placesSearchProviders");

const CATEGORY_DATABASE_MATCHES = {
  "frozen-food": ["restaurant", "shopping"],
  "food-dining": ["restaurant", "cafe", "bakery", "ice-cream", "dessert"],
  accommodation: ["hotel", "resort", "guest-house", "short-let"],
  "automotive-services": [
    "car-repair",
    "car-wash",
    "fuel-station",
    "car-rental",
  ],
  "beauty-personal-care": ["salon", "barbershop", "nail-salon", "wellness"],
  "shopping-retail": ["shopping", "market", "supermarket"],
  "swimming-pool": ["swimming-pool", "recreation"],
  "car-wash": ["car-wash"],
  mechanic: ["car-repair"],
  "hair-salon": ["salon"],
  barbershop: ["barbershop"],
  "nail-salon": ["nail-salon", "salon"],
  tailor: ["tailor", "shopping"],
  "tea-spot": ["cafe"],
  "game-centre": ["family-activity", "entertainment", "recreation"],
  sports: ["sports", "recreation"],
  lounge: ["nightlife", "entertainment"],

  church: ["religious-site"],
  mosque: ["religious-site"],
  worship: ["religious-site"],

  healthcare: [
    "hospital",
    "clinic",
    "pharmacy",
    "diagnostic-laboratory",
    "dental-clinic",
    "eye-clinic",
    "wellness",
  ],

  restaurant: ["restaurant"],

  cafe: ["cafe"],

  bakery: ["restaurant", "cafe"],

  "ice-cream": ["restaurant", "cafe"],

  hotel: ["hotel", "resort", "guest-house", "short-let"],

  "filling-station": ["fuel-station"],

  park: ["park", "playground", "recreation"],

  "tourist-attraction": [
    "attraction",
    "historical-site",
    "museum",
    "heritage-site",
    "waterfall",
    "scenic-viewpoint",
    "nature",
    "culture",
  ],

  recreation: [
    "recreation",
    "entertainment",
    "cinema",
    "family-activity",
    "sports",
    "nightlife",
  ],

  shopping: ["shopping", "market", "supermarket"],

  bank: ["bank", "atm"],

  transport: [
    "transport",
    "bus-terminal",
    "railway-station",
    "parking",
    "car-rental",
    "car-repair",
  ],

  education: ["university", "school", "library"],
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function calculateDistanceMeters(latitude1, longitude1, latitude2, longitude2) {
  const earthRadius = 6371000;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);

  const differenceLatitude = toRadians(latitude2 - latitude1);

  const differenceLongitude = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(differenceLatitude / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(differenceLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function getCoordinates(destination) {
  const coordinates = destination.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return null;
  }

  // GeoJSON stores coordinates as [longitude, latitude].
  const [longitude, latitude] = coordinates;

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function buildTextConditions(query) {
  const normalizedQuery = normalizeText(query);

  const words = normalizedQuery.split(/\s+/).filter((word) => word.length >= 2);

  if (!words.length) {
    return [];
  }

  const searchableFields = [
    "name",
    "description",
    "shortDescription",
    "categoryLabel",
    "category",
    "city",
    "lga",
    "address",
    "tags",
    "amenities",
  ];

  const wordConditions = words.map((word) => {
    const regex = new RegExp(escapeRegex(word), "i");

    return {
      $or: searchableFields.map((field) => ({
        [field]: regex,
      })),
    };
  });

  return [
    {
      $or: wordConditions,
    },
  ];
}

function buildCategoryConditions(rule) {
  if (!rule?.category) {
    return [];
  }

  const category = rule.category;

  const databaseCategories = CATEGORY_DATABASE_MATCHES[category] || [];

  const conditions = [];

  if (databaseCategories.length) {
    conditions.push({
      category: {
        $in: databaseCategories,
      },
    });
  }

  // Match category labels and tags.
  // Supports both hyphenated and space-separated category names.
  // Example: "tourist-attraction" matches "tourist attraction".
  const categoryPattern = category.split("-").map(escapeRegex).join("[\\s-]+");

  const categoryRegex = new RegExp(categoryPattern, "i");

  conditions.push({
    $or: [
      {
        categoryLabel: categoryRegex,
      },
      {
        tags: categoryRegex,
      },
    ],
  });

  return [
    {
      $or: conditions,
    },
  ];
}

function mapDestination(destination, origin) {
  const coordinates = getCoordinates(destination);

  let distanceMeters = null;

  if (coordinates && origin) {
    distanceMeters = calculateDistanceMeters(
      origin.latitude,
      origin.longitude,
      coordinates.latitude,
      coordinates.longitude,
    );
  }

  const images = Array.isArray(destination.images)
    ? destination.images
        .map((image) => ({
          url: image.url || "",
          alt: image.alt || "",
        }))
        .filter((image) => image.url)
    : [];

  const image = destination.coverImage || images[0]?.url || null;

  return {
    id: `kaduna-${destination._id}`,

    _id: destination._id,

    placeId: `kaduna-explorer-${destination._id}`,

    name: destination.name,

    description: destination.description || "",

    shortDescription: destination.shortDescription || "",

    category: destination.category,

    categoryLabel: destination.categoryLabel || "",

    address: destination.address || "",

    city: destination.city || "",

    lga: destination.lga || "",

    state: destination.state || "Kaduna",

    latitude: coordinates?.latitude ?? null,

    longitude: coordinates?.longitude ?? null,

    location: coordinates
      ? {
          type: "Point",
          coordinates: [coordinates.longitude, coordinates.latitude],
        }
      : null,

    distanceMeters,

    rating: destination.averageRating ?? 0,

    averageRating: destination.averageRating ?? 0,

    ratingsCount: destination.ratingsCount ?? 0,

    phone: destination.contactPhone || null,

    contactPhone: destination.contactPhone || null,

    email: destination.contactEmail || null,

    website: destination.website || null,

    reservationUrl: destination.reservationUrl || null,

    openingHours: destination.openingHours || {},

    image,

    photoUrl: image,

    coverImage: destination.coverImage || null,

    images,

    tags: destination.tags || [],

    amenities: destination.amenities || [],

    suitableFor: destination.suitableFor || [],

    priceLevel: destination.priceLevel || "unknown",

    entranceFee: destination.entranceFee || "",

    slug: destination.slug,

    source: "Kaduna Explorer",

    provider: "Kaduna Explorer",

    isDatabaseDestination: true,
  };
}

async function searchDatabaseDestinations({
  query,
  rule,
  origin,
  radius,
  limit = DEFAULT_RESULTS_LIMIT,
}) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_RESULTS_LIMIT, 1),
    MAX_RESULTS_LIMIT,
  );

  const conditions = [
    {
      isPublished: true,
    },
    {
      state: {
        $regex: /^kaduna(?:\s+state)?$/i,
      },
    },
  ];

  // Apply category matching when the query is a recognized category.
  if (rule) {
    const categoryConditions = buildCategoryConditions(rule);

    if (categoryConditions.length) {
      conditions.push(...categoryConditions);
    }
  } else {
    // Otherwise perform a general text search.
    const textConditions = buildTextConditions(query);

    if (textConditions.length) {
      conditions.push(...textConditions);
    }
  }

  const mongoQuery = {
    $and: conditions,
  };

  // Use MongoDB's geospatial index for nearby destinations.
  if (origin) {
    mongoQuery.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [origin.longitude, origin.latitude],
        },

        $maxDistance: radius,
      },
    };
  }

  const destinations = await Destination.find(mongoQuery)
    .select(
      [
        "name",
        "slug",
        "description",
        "shortDescription",
        "category",
        "categoryLabel",
        "address",
        "city",
        "lga",
        "state",
        "location",
        "images",
        "coverImage",
        "priceLevel",
        "entranceFee",
        "averageRating",
        "ratingsCount",
        "openingHours",
        "contactPhone",
        "contactEmail",
        "website",
        "reservationUrl",
        "tags",
        "amenities",
        "suitableFor",
        "isPublished",
      ].join(" "),
    )
    .limit(safeLimit)
    .lean();

  let mappedPlaces = destinations.map((destination) =>
    mapDestination(destination, origin),
  );

  // A CMS religious-site can belong to Church or Mosque, but never both.
  // Reuse the same classifier as Google, Geoapify and OpenStreetMap so
  // provider and database results follow identical religious-category rules.
  if (rule?.category === "church" || rule?.category === "mosque") {
    mappedPlaces = mappedPlaces.filter((place) => {
      const tags = Array.isArray(place.tags)
        ? place.tags.join(" ")
        : String(place.tags || "");

      const religiousText = [
        place.name,
        place.categoryLabel,
        place.description,
        place.shortDescription,
        tags,
      ]
        .filter(Boolean)
        .join(" ");

      return classifyReligiousPlace({ name: religiousText }) === rule.category;
    });
  }

  // Ensure results are nearest-first when coordinates are available.
  if (origin) {
    mappedPlaces.sort((a, b) => {
      const distanceA = Number.isFinite(a.distanceMeters)
        ? a.distanceMeters
        : Infinity;

      const distanceB = Number.isFinite(b.distanceMeters)
        ? b.distanceMeters
        : Infinity;

      return distanceA - distanceB;
    });
  }

  return mappedPlaces;
}

module.exports = {
  searchDatabaseDestinations,
  mapDestination,
  calculateDistanceMeters,
  buildTextConditions,
  buildCategoryConditions,
};

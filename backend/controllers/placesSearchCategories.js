"use strict";

const { normalizeText } = require("./placesSearchConfig");

// ==================================================
// CATEGORY RULES
// Single source of truth for search categories.
// ==================================================

const CATEGORY_RULES = [
  // Church includes different Christian denominations, synagogues,
  // cathedrals, chapels and general prayer centres.
  {
    category: "church",
    terms: [
      "church",
      "churches",
      "chapel",
      "chapels",
      "cathedral",
      "cathedrals",
      "pentecostal",
      "orthodox",
      "catholic church",
      "anglican church",
      "baptist church",
      "methodist church",
      "presbyterian church",
      "apostolic church",
      "evangelical church",
      "synagogue",
      "synagogues",
      "prayer centre",
      "prayer centres",
      "prayer center",
      "prayer centers",
      "worship centre",
      "worship centres",
      "worship center",
      "worship centers",
      "religious centre",
      "religious centres",
      "religious center",
      "religious centers",
      "place of worship",
      "places of worship",
    ],
    categories: ["religion.place_of_worship"],
  },
  {
    category: "mosque",
    terms: [
      "mosque",
      "mosques",
      "masjid",
      "masjids",
      "central mosque",
      "central mosques",
      "grand mosque",
      "grand mosques",
      "national mosque",
      "national mosques",
      "jumuah mosque",
      "jummah mosque",
      "islamic mosque",
      "muslim mosque",
    ],
    categories: ["religion.place_of_worship"],
  },
  {
    category: "healthcare",
    terms: [
      "hospital",
      "hospitals",
      "clinic",
      "clinics",
      "medical centre",
      "medical center",
      "health centre",
      "health center",
      "healthcare",
      "doctor",
      "doctors",
      "pharmacy",
      "pharmacies",
      "chemist",
      "chemists",
      "dental clinic",
      "dentist",
      "dentists",
      "eye clinic",
      "optician",
      "maternity",
      "medical laboratory",
      "diagnostic centre",
      "diagnostic center",
      "physiotherapy",
      "veterinary clinic",
      "animal hospital",
    ],
    categories: [
      "healthcare.hospital",
      "healthcare.clinic",
      "healthcare.pharmacy",
      "healthcare.doctor",
      "healthcare.dentist",
      "healthcare.veterinary",
      "healthcare.laboratory",
    ],
  },
  {
    category: "restaurant",
    terms: [
      "restaurant",
      "restaurants",
      "eatery",
      "eateries",
      "buka",
      "bukas",
      "bukateria",
      "bukaterias",
      "local buka",
      "local bukas",
      "local food",
      "nigerian food",
      "food spot",
      "food spots",
      "fast food",
      "takeaway",
      "takeaways",
      "suya",
      "grill",
      "grills",
      "barbecue",
      "shawarma",
      "sandwich",
      "sandwiches",
      "breakfast",
      "brunch",
      "pizza",
      "pizzeria",
      "burger",
      "burgers",
      "seafood",
      "food court",
      "canteen",
    ],
    categories: [
      "catering.restaurant",
      "catering.fast_food",
      "catering.food_court",
    ],
  },
  {
    category: "cafe",
    terms: [
      "cafe",
      "cafes",
      "coffee shop",
      "coffee shops",
      "coffee house",
      "coffee houses",
    ],
    categories: ["catering.cafe"],
  },
  {
    category: "bakery",
    terms: ["bakery", "bakeries"],
    categories: ["commercial.food_and_drink.bakery", "catering.bakery"],
  },
  {
    category: "ice-cream",
    terms: [
      "ice cream",
      "ice cream shop",
      "ice cream shops",
      "ice cream parlour",
      "ice cream parlor",
    ],
    categories: ["catering.ice_cream"],
  },
  {
    category: "dessert",
    terms: [
      "dessert",
      "desserts",
      "dessert shop",
      "dessert shops",
      "pastry",
      "pastries",
      "confectionery",
      "sweet shop",
      "sweet shops",
    ],
    categories: [
      "catering.dessert",
      "catering.juice",
      "commercial.food_and_drink",
    ],
  },
  {
    category: "hotel",
    terms: [
      "hotel",
      "hotels",
      "motel",
      "motels",
      "guest house",
      "guesthouse",
      "guest houses",
      "lodge",
      "lodges",
      "hostel",
      "hostels",
      "resort",
      "resorts",
      "serviced apartment",
      "short stay apartment",
      "holiday apartment",
    ],
    categories: [
      "accommodation.hotel",
      "accommodation.motel",
      "accommodation.guest_house",
      "accommodation.hostel",
      "accommodation.resort",
      "accommodation.apartment",
    ],
  },
  {
    category: "filling-station",
    terms: [
      "fuel",
      "fuel station",
      "fuel stations",
      "filling station",
      "filling stations",
      "petrol station",
      "petrol stations",
      "gas station",
      "gas stations",
    ],
    categories: ["service.vehicle.fuel"],
  },
  {
    category: "park",
    terms: [
      "park",
      "parks",
      "picnic",
      "picnic spot",
      "picnic spots",
      "garden",
      "gardens",
      "playground",
      "playgrounds",
      "recreational area",
    ],
    categories: ["leisure.park", "leisure.garden", "leisure.playground"],
  },
  {
    category: "tourist-attraction",
    terms: [
      "tourist attraction",
      "tourist attractions",
      "attraction",
      "attractions",
      "tourist site",
      "tourist sites",
      "museum",
      "museums",
      "waterfall",
      "waterfalls",
      "monument",
      "monuments",
      "landmark",
      "landmarks",
      "historical site",
      "historical sites",
      "cultural site",
      "cultural sites",
      "historic site",
      "historic sites",
      "viewpoint",
      "viewpoints",
      "art gallery",
      "visitor centre",
      "visitor center",
    ],
    categories: [
      "tourism.attraction",
      "tourism.sights",
      "entertainment.museum",
      "entertainment.culture",
    ],
  },
  {
    category: "recreation",
    terms: [
      "recreation",
      "recreational centre",
      "recreational center",
      "gym",
      "fitness centre",
      "fitness center",
      "sports centre",
      "sports center",
      "cinema",
      "theatre",
      "theater",
      "nightclub",
      "bowling",
    ],
    categories: [
      "leisure.sports_centre",
      "leisure.fitness_centre",
      "leisure.swimming_pool",
      "entertainment.cinema",
      "entertainment.nightclub",
    ],
  },
  {
    category: "shopping",
    terms: [
      "shopping",
      "shop",
      "shops",
      "market",
      "markets",
      "supermarket",
      "supermarkets",
      "mall",
      "malls",
      "boutique",
      "boutiques",
      "grocery",
      "groceries",
      "electronics shop",
      "phone shop",
      "bookshop",
      "hardware shop",
    ],
    categories: [
      "commercial",
      "commercial.supermarket",
      "commercial.shopping_mall",
      "commercial.clothing",
      "commercial.electronics",
    ],
  },
  {
    category: "bank",
    terms: [
      "bank",
      "banks",
      "atm",
      "atms",
      "financial service",
      "financial services",
    ],
    categories: ["service.financial"],
  },
  {
    category: "transport",
    terms: [
      "transport",
      "transportation",
      "bus station",
      "bus stations",
      "bus terminal",
      "bus terminals",
      "bus stop",
      "bus stops",
      "taxi",
      "taxi rank",
      "airport",
      "airports",
      "train station",
      "train stations",
      "parking",
      "car rental",
      "car rentals",
      "fuel station",
      "petrol station",
    ],
    categories: ["public_transport", "service.vehicle", "service.vehicle.fuel"],
  },
  {
    category: "education",
    terms: [
      "school",
      "schools",
      "university",
      "universities",
      "college",
      "colleges",
      "polytechnic",
      "polytechnics",
      "library",
      "libraries",
      "nursery",
      "nurseries",
      "daycare",
      "training centre",
      "training center",
    ],
    categories: [
      "education.school",
      "education.university",
      "education.college",
      "education.library",
    ],
  },
  {
    category: "frozen-food",
    terms: [
      "frozen food",
      "frozen foods",
      "frozen food shop",
      "frozen food store",
    ],
    categories: ["commercial.food_and_drink", "shop.food"],
  },
  // Broad discovery categories aggregate related local businesses.
  {
    category: "food-dining",
    terms: [
      "food & dining",
      "food and dining",
      "food dining",
      "food",
      "dining",
      "food spots",
    ],
    categories: [
      "catering.restaurant",
      "catering.fast_food",
      "catering.food_court",
      "catering.cafe",
      "catering.bakery",
      "catering.ice_cream",
      "catering.dessert",
      "catering.juice",
      "commercial.food_and_drink",
    ],
  },
  {
    category: "accommodation",
    terms: ["accommodation", "places to stay", "stay", "stays", "lodging"],
    categories: [
      "accommodation.hotel",
      "accommodation.motel",
      "accommodation.guest_house",
      "accommodation.hostel",
      "accommodation.resort",
      "accommodation.apartment",
    ],
  },
  {
    category: "automotive-services",
    terms: [
      "automotive services",
      "auto services",
      "vehicle services",
      "car services",
    ],
    categories: [
      "service.vehicle",
      "service.vehicle.repair",
      "service.vehicle.car_wash",
      "service.vehicle.fuel",
      "service.vehicle.tyres",
    ],
  },
  {
    category: "beauty-personal-care",
    terms: [
      "beauty and personal care",
      "beauty & personal care",
      "personal care",
      "beauty services",
    ],
    categories: [
      "commercial.health_and_beauty",
      "service.beauty",
      "service.hairdresser",
      "service.beauty.nails",
    ],
  },
  {
    category: "shopping-retail",
    terms: ["shopping and retail", "shopping & retail", "retail", "shopping"],
    categories: [
      "commercial",
      "commercial.supermarket",
      "commercial.shopping_mall",
      "commercial.clothing",
      "commercial.electronics",
    ],
  },
  {
    category: "professional-services",
    terms: ["professional services", "local services", "business services"],
    categories: ["service", "office"],
  },
  {
    category: "swimming-pool",
    terms: ["swimming pool", "swimming pools", "pool"],
    categories: ["leisure.swimming_pool"],
  },
  {
    category: "car-wash",
    terms: ["car wash", "car washes", "vehicle wash"],
    categories: ["service.vehicle.car_wash"],
  },
  {
    category: "mechanic",
    terms: [
      "mechanic",
      "mechanics",
      "auto mechanic",
      "car mechanic",
      "vehicle mechanic",
      "motor mechanic",
      "car repair",
      "auto repair",
    ],
    categories: ["service.vehicle.repair", "service.vehicle"],
  },
  {
    category: "hair-salon",
    terms: [
      "hair salon",
      "hair salons",
      "hair stylist",
      "hair stylists",
      "hairdresser",
      "hairdressers",
      "salon",
    ],
    categories: [
      "service.hairdresser",
      "commercial.health_and_beauty.hairdresser",
    ],
  },
  {
    category: "barbershop",
    terms: ["barber", "barbers", "barbershop", "barber shop"],
    categories: ["service.hairdresser"],
  },
  {
    category: "nail-salon",
    terms: [
      "nail salon",
      "nail salons",
      "nail technician",
      "nail technicians",
      "nail studio",
    ],
    categories: ["service.beauty.nails", "commercial.health_and_beauty"],
  },
  {
    category: "tailor",
    terms: [
      "tailor",
      "tailors",
      "tailoring",
      "fashion designer",
      "fashion designers",
      "seamstress",
    ],
    categories: ["service.tailor", "commercial.clothing"],
  },
  {
    category: "tea-spot",
    terms: [
      "tea spot",
      "tea spots",
      "tea shop",
      "tea shops",
      "tea house",
      "tea houses",
      "tea",
    ],
    categories: ["catering.cafe", "catering.tea"],
  },
  {
    category: "game-centre",
    terms: [
      "game centre",
      "game center",
      "gaming centre",
      "gaming center",
      "video games",
      "games",
      "arcade",
    ],
    categories: ["leisure.amusement_arcade", "entertainment"],
  },
  {
    category: "sports",
    terms: [
      "sports",
      "sports facilities",
      "sports centre",
      "sports center",
      "football pitch",
      "football fields",
    ],
    categories: ["leisure.sports_centre", "leisure.pitch", "sport"],
  },
  {
    category: "lounge",
    terms: ["lounge", "lounges", "lounge bar"],
    categories: ["catering.bar", "catering.pub", "catering"],
  },
];
// ==================================================
// CATEGORY INTENT WORDS
// Words ignored when identifying a category in a query.
// ==================================================

const CATEGORY_INTENT_WORDS = new Set([
  "in",
  "around",
  "near",
  "me",
  "kaduna",
  "state",
  "nigeria",
  "good",
  "best",
  "top",
  "nearby",
  "places",
  "place",
  "spots",
  "spot",
  "within",
  "the",
  "is",
  "there",
  "any",
  "a",
  "an",
  "to",
  "of",
  "for",
  "i",
  "can",
  "where",
  "find",
  "show",
  "close",
  "closest",
  "please",
  "search",
  "looking",
  "look",
  "want",
  "need",
  "some",
  "all",
  "available",
]);

// ==================================================
// CATEGORY MATCHING
// Supports category phrases inside longer searches.
// ==================================================

function normalizeCategoryText(value) {
  return normalizeText(String(value || ""))
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalize category terms once instead of rebuilding them for every search.
const CATEGORY_TERMS = CATEGORY_RULES.flatMap((rule) =>
  rule.terms.map((term) => ({
    rule,
    term: normalizeCategoryText(term),
  })),
);

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const old = row[j];

      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );

      previous = old;
    }
  }

  return row[b.length];
}

function getQueryWords(query) {
  return normalizeCategoryText(query)
    .split(" ")
    .filter((word) => word && !CATEGORY_INTENT_WORDS.has(word));
}

function findExactCategoryMatches(queryWords, terms) {
  const matches = [];

  for (const item of terms) {
    const termWords = item.term.split(" ");

    if (termWords.length > queryWords.length) {
      continue;
    }

    for (
      let start = 0;
      start <= queryWords.length - termWords.length;
      start++
    ) {
      const phrase = queryWords.slice(start, start + termWords.length);

      if (phrase.join(" ") === item.term) {
        matches.push({
          ...item,
          matchedWordCount: termWords.length,
        });
      }
    }
  }

  return matches;
}

function findFuzzyCategoryMatches(queryWords, terms) {
  const matches = [];

  for (const item of terms) {
    const termWords = item.term.split(" ");

    if (termWords.length > queryWords.length) {
      continue;
    }

    for (
      let start = 0;
      start <= queryWords.length - termWords.length;
      start++
    ) {
      const phrase = queryWords.slice(start, start + termWords.length);

      let typoCount = 0;
      let distanceTotal = 0;
      let eligible = true;

      for (let i = 0; i < termWords.length; i++) {
        if (phrase[i] === termWords[i]) {
          continue;
        }

        const maxDistance =
          Math.max(phrase[i].length, termWords[i].length) >= 8 ? 2 : 1;

        const distance = editDistance(phrase[i], termWords[i]);

        if (
          distance === 0 ||
          distance > maxDistance ||
          Math.min(phrase[i].length, termWords[i].length) < 4
        ) {
          eligible = false;
          break;
        }

        typoCount++;
        distanceTotal += distance;
      }

      if (eligible && typoCount === 1) {
        matches.push({
          ...item,
          typoCount,
          distanceTotal,
          matchedWordCount: termWords.length,
        });
      }
    }
  }

  return matches;
}

function selectCategoryMatch(matches) {
  if (!matches.length) {
    return null;
  }

  matches.sort(
    (a, b) =>
      (b.matchedWordCount || 0) - (a.matchedWordCount || 0) ||
      (a.typoCount || 0) - (b.typoCount || 0) ||
      (a.distanceTotal || 0) - (b.distanceTotal || 0) ||
      b.term.length - a.term.length,
  );

  const best = matches[0];

  const tiedOtherCategory = matches
    .slice(1)
    .some(
      (candidate) =>
        candidate.matchedWordCount === best.matchedWordCount &&
        (candidate.typoCount || 0) === (best.typoCount || 0) &&
        (candidate.distanceTotal || 0) === (best.distanceTotal || 0) &&
        candidate.rule.category !== best.rule.category,
    );

  return tiedOtherCategory ? null : best.rule;
}

function findCategoryRule(query) {
  const queryWords = getQueryWords(query);

  if (!queryWords.length) {
    return null;
  }

  const exactMatches = findExactCategoryMatches(queryWords, CATEGORY_TERMS);

  if (exactMatches.length) {
    // Explicit mosque identifiers outrank generic prayer/worship-centre phrases.
    const hasMosqueIdentifier = exactMatches.some(
      ({ rule }) => rule.category === "mosque",
    );

    const specificChurchMatches = exactMatches.filter(
      ({ rule, term }) =>
        rule.category !== "church" ||
        ![
          "prayer centre",
          "prayer centres",
          "prayer center",
          "prayer centers",
          "worship centre",
          "worship centres",
          "worship center",
          "worship centers",
          "religious centre",
          "religious centres",
          "religious center",
          "religious centers",
          "place of worship",
          "places of worship",
        ].includes(term),
    );

    return selectCategoryMatch(
      hasMosqueIdentifier && specificChurchMatches.length
        ? specificChurchMatches
        : exactMatches,
    );
  }

  return selectCategoryMatch(
    findFuzzyCategoryMatches(queryWords, CATEGORY_TERMS),
  );
}

// ==================================================
// GOOGLE PLACES INCLUDED TYPES
// ==================================================

const GOOGLE_INCLUDED_TYPES = {
  "frozen-food": ["grocery_store", "supermarket"],
  "food-dining": [
    "restaurant",
    "fast_food_restaurant",
    "food_court",
    "cafe",
    "bakery",
    "ice_cream_shop",
    "dessert_shop",
    "juice_shop",
  ],
  accommodation: ["hotel", "motel", "resort_hotel", "hostel", "guest_house"],
  "automotive-services": [
    "car_repair",
    "car_wash",
    "gas_station",
    "car_rental",
    "tire_shop",
  ],
  "beauty-personal-care": [
    "beauty_salon",
    "hair_care",
    "barber_shop",
    "nail_salon",
    "spa",
  ],
  "shopping-retail": [
    "shopping_mall",
    "supermarket",
    "convenience_store",
    "grocery_store",
    "clothing_store",
    "electronics_store",
  ],
  "swimming-pool": ["swimming_pool"],
  "car-wash": ["car_wash"],
  mechanic: ["car_repair"],
  "hair-salon": ["beauty_salon", "hair_care"],
  barbershop: ["barber_shop"],
  "nail-salon": ["nail_salon"],
  tailor: ["clothing_store"],
  "tea-spot": ["cafe"],
  "game-centre": ["amusement_center", "arcade"],
  sports: ["sports_complex", "stadium"],
  lounge: ["bar", "night_club"],
  // Google has no dedicated chapel/cathedral type; these use church discovery
  // and are narrowed by the category-specific text query and relevance checks.
  church: ["church", "synagogue"],
  mosque: ["mosque"],
  healthcare: [
    "hospital",
    "medical_clinic",
    "doctor",
    "pharmacy",
    "dentist",
    "veterinary_care",
  ],
  restaurant: [
    "restaurant",
    "fast_food_restaurant",
    "food_court",
    "meal_takeaway",
    "meal_delivery",
  ],
  cafe: ["cafe"],
  bakery: ["bakery"],
  "ice-cream": ["ice_cream_shop"],
  dessert: ["dessert_shop", "juice_shop"],
  hotel: ["hotel", "motel", "resort_hotel", "hostel", "guest_house"],
  "filling-station": ["gas_station"],
  park: ["park", "playground", "garden"],
  "tourist-attraction": [
    "tourist_attraction",
    "museum",
    "historical_landmark",
    "monument",
    "art_gallery",
    "cultural_center",
    "visitor_center",
  ],
  recreation: [
    "amusement_center",
    "movie_theater",
    "night_club",
    "bowling_alley",
    "gym",
    "sports_complex",
  ],
  shopping: [
    "shopping_mall",
    "supermarket",
    "convenience_store",
    "grocery_store",
    "market",
    "clothing_store",
    "electronics_store",
    "book_store",
    "hardware_store",
    "department_store",
  ],
  bank: ["bank", "atm"],
  transport: [
    "bus_station",
    "train_station",
    "transit_station",
    "airport",
    "parking",
    "car_rental",
    "car_repair",
    "gas_station",
  ],
  education: [
    "school",
    "primary_school",
    "secondary_school",
    "university",
    "library",
  ],
};

// ==================================================
// GOOGLE TEXT SEARCH QUERIES
// ==================================================

const GOOGLE_TEXT_QUERIES = {
  "frozen-food": "frozen food shops and frozen food stores",
  "food-dining":
    "restaurants, local eateries, bukas, cafes, tea spots, bakeries, ice cream and dessert shops",
  accommodation:
    "hotels, motels, guest houses, lodges, hostels, resorts and serviced apartments",
  "automotive-services":
    "car mechanics, auto repair workshops, car washes, tyre services and vehicle services",
  "beauty-personal-care":
    "beauty salons, hair salons, barbershops, nail salons and spas",
  "shopping-retail":
    "markets, shopping centres, malls, supermarkets and retail shops",
  "swimming-pool": "public swimming pools and swimming facilities",
  "car-wash": "car wash and vehicle cleaning services",
  mechanic: "car mechanics, auto mechanics and vehicle repair workshops",
  "hair-salon": "hair salons and hair stylists",
  barbershop: "barbershops and barber services",
  "nail-salon": "nail salons and nail technicians",
  tailor: "tailors, tailoring shops and fashion designers",
  "tea-spot": "tea spots, tea shops and tea houses",
  "game-centre": "game centres, gaming centres and video game arcades",
  sports: "sports centres, football pitches and sports facilities",
  lounge: "lounges and lounge bars",
  church:
    "churches, chapels, cathedrals, Pentecostal and Orthodox churches, synagogues and prayer centres",
  mosque: "mosques, masjids, central mosques and grand mosques",
  healthcare: "hospitals clinics pharmacies and doctors",
  restaurant:
    "restaurants, Nigerian local eateries, bukas, bukaterias, suya spots, fast food, grills and takeaway food businesses",
  cafe: "cafes and coffee shops",
  bakery: "bakeries",
  "ice-cream": "ice cream shops",
  dessert: "dessert shops and pastry shops",
  hotel: "hotels guest houses and accommodation",
  "filling-station": "petrol stations and gas stations",
  park: "parks gardens and playgrounds",
  "tourist-attraction": "tourist attractions and landmarks",
  recreation: "recreation and entertainment places",
  shopping: "shops markets and shopping centres",
  bank: "banks and ATMs",
  transport: "transport stations and parking",
  education: "schools universities and libraries",
};

// ==================================================
// OPENSTREETMAP OVERPASS TAGS
// Exact tags reduce unrelated search results.
// ==================================================

const OVERPASS_CATEGORY_TAGS = {
  "frozen-food": [
    ["shop", "frozen_food"],
    ["shop", "food"],
  ],
  "food-dining": [
    ["amenity", "restaurant"],
    ["amenity", "fast_food"],
    ["amenity", "food_court"],
    ["amenity", "cafe"],
    ["shop", "bakery"],
    ["amenity", "ice_cream"],
    ["shop", "pastry"],
  ],
  accommodation: [
    ["tourism", "hotel"],
    ["tourism", "guest_house"],
    ["tourism", "motel"],
    ["tourism", "hostel"],
    ["tourism", "apartment"],
    ["tourism", "resort"],
  ],
  "automotive-services": [
    ["shop", "car_repair"],
    ["amenity", "car_wash"],
    ["amenity", "fuel"],
    ["amenity", "car_rental"],
    ["shop", "tyres"],
  ],
  "beauty-personal-care": [
    ["shop", "hairdresser"],
    ["shop", "beauty"],
    ["shop", "barber"],
    ["shop", "massage"],
  ],
  "shopping-retail": [
    ["shop", "supermarket"],
    ["shop", "convenience"],
    ["shop", "mall"],
    ["shop", "clothes"],
    ["shop", "electronics"],
    ["amenity", "marketplace"],
  ],
  "swimming-pool": [["leisure", "swimming_pool"]],
  "car-wash": [["amenity", "car_wash"]],
  mechanic: [
    ["shop", "car_repair"],
    ["craft", "car_repair"],
  ],
  "hair-salon": [["shop", "hairdresser"]],
  barbershop: [
    ["shop", "barber"],
    ["shop", "hairdresser"],
  ],
  "nail-salon": [["shop", "beauty"]],
  tailor: [
    ["shop", "tailor"],
    ["craft", "tailor"],
  ],
  "tea-spot": [["amenity", "cafe"]],
  "game-centre": [["leisure", "amusement_arcade"]],
  sports: [
    ["leisure", "sports_centre"],
    ["leisure", "pitch"],
    ["sport", "soccer"],
  ],
  lounge: [
    ["amenity", "bar"],
    ["amenity", "pub"],
  ],
  // Both religion categories discover places of worship, then the provider
  // layer must classify religion/denomination/name before accepting results.
  church: [["amenity", "place_of_worship"]],
  mosque: [["amenity", "place_of_worship"]],
  healthcare: [
    ["amenity", "hospital"],
    ["amenity", "clinic"],
    ["amenity", "doctors"],
    ["amenity", "dentist"],
    ["amenity", "pharmacy"],
    ["healthcare", "hospital"],
    ["healthcare", "clinic"],
    ["healthcare", "doctor"],
    ["healthcare", "pharmacy"],
    ["healthcare", "dentist"],
    ["amenity", "veterinary"],
  ],
  restaurant: [
    ["amenity", "restaurant"],
    ["amenity", "fast_food"],
    ["amenity", "food_court"],
  ],
  cafe: [["amenity", "cafe"]],
  bakery: [["shop", "bakery"]],
  "ice-cream": [["amenity", "ice_cream"]],
  dessert: [
    ["shop", "pastry"],
    ["shop", "confectionery"],
  ],
  hotel: [
    ["tourism", "hotel"],
    ["tourism", "guest_house"],
    ["tourism", "motel"],
    ["tourism", "hostel"],
    ["tourism", "apartment"],
    ["tourism", "resort"],
  ],
  "filling-station": [["amenity", "fuel"]],
  park: [
    ["leisure", "park"],
    ["leisure", "garden"],
    ["leisure", "playground"],
  ],
  "tourist-attraction": [
    ["tourism", "attraction"],
    ["tourism", "museum"],
    ["historic", "monument"],
    ["historic", "memorial"],
    ["tourism", "viewpoint"],
    ["natural", "waterfall"],
  ],
  recreation: [
    ["leisure", "sports_centre"],
    ["leisure", "fitness_centre"],
    ["leisure", "swimming_pool"],
    ["amenity", "cinema"],
    ["amenity", "arts_centre"],
    ["amenity", "theatre"],
    ["leisure", "bowling_alley"],
    ["amenity", "nightclub"],
  ],
  shopping: [
    ["shop", "supermarket"],
    ["shop", "convenience"],
    ["shop", "mall"],
    ["shop", "clothes"],
    ["shop", "electronics"],
    ["shop", "mobile_phone"],
    ["shop", "books"],
    ["shop", "hardware"],
    ["shop", "general"],
    ["amenity", "marketplace"],
  ],
  bank: [
    ["amenity", "bank"],
    ["amenity", "atm"],
  ],
  transport: [
    ["amenity", "bus_station"],
    ["highway", "bus_stop"],
    ["amenity", "taxi"],
    ["amenity", "car_rental"],
    ["amenity", "parking"],
    ["amenity", "car_wash"],
    ["railway", "station"],
    ["public_transport", "station"],
  ],
  education: [
    ["amenity", "school"],
    ["amenity", "college"],
    ["amenity", "university"],
    ["amenity", "library"],
    ["amenity", "kindergarten"],
  ],
};

// ==================================================
// HELPER FUNCTIONS
// ==================================================

function getCategoryName(ruleOrCategory) {
  if (typeof ruleOrCategory === "string") {
    return ruleOrCategory;
  }

  return ruleOrCategory?.category || null;
}

function getGoogleIncludedTypes(ruleOrCategory) {
  const category = getCategoryName(ruleOrCategory);

  if (!category) {
    return [];
  }

  return GOOGLE_INCLUDED_TYPES[category] || [];
}

function getGeoapifyMatchCategories(ruleOrCategory) {
  const rule =
    typeof ruleOrCategory === "string"
      ? CATEGORY_RULES.find(({ category }) => category === ruleOrCategory)
      : ruleOrCategory;

  if (!Array.isArray(rule?.categories)) {
    return [];
  }

  // Geoapify uses this broad parent for discovery, but it is too broad
  // to accept every food-and-drink business as a dessert result.
  return rule.category === "dessert"
    ? rule.categories.filter(
        (category) => category !== "commercial.food_and_drink",
      )
    : rule.categories;
}

function getGoogleTextQuery(ruleOrCategory, origin) {
  const category = getCategoryName(ruleOrCategory);
  const categoryQuery = GOOGLE_TEXT_QUERIES[category] || category || "places";

  if (
    origin &&
    Number.isFinite(Number(origin.latitude)) &&
    Number.isFinite(Number(origin.longitude))
  ) {
    return (
      `${categoryQuery} near ${origin.latitude}, ` +
      `${origin.longitude}, Kaduna State, Nigeria`
    );
  }

  return `${categoryQuery} in Kaduna State, Nigeria`;
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  CATEGORY_RULES,
  findCategoryRule,
  GOOGLE_INCLUDED_TYPES,
  GOOGLE_TEXT_QUERIES,
  OVERPASS_CATEGORY_TAGS,
  getGoogleIncludedTypes,
  getGoogleTextQuery,
  getCategoryName,
  getGeoapifyMatchCategories,
};

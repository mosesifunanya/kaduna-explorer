import {
  Building2,
  CalendarDays,
  Coffee,
  Compass,
  Fuel,
  Heart,
  Hotel,
  Landmark,
  Search,
  ShieldCheck,
  Stethoscope,
  Trees,
  Utensils,
  GraduationCap,
  MapPin,
  Camera,
  Sparkles,
  Users,
  BookOpen,
  Navigation,
} from "lucide-react";

// ============================================
// MAIN NAVIGATION
// ============================================

export const navigationLinks = [
  { label: "Home", href: "/", key: "home" },
  { label: "Explore", href: "/explore", key: "explore" },
  { label: "Events", href: "/events", key: "events" },
  { label: "Travel Guides", href: "/guides", key: "guides" },
  { label: "About", href: "/#about", key: "about" },
];

// ============================================
// DESTINATION CATEGORIES
// ============================================

export const categories = [
  {
    name: "Tourist Attraction",
    icon: Landmark,
    color: "bg-orange-50 text-orange-700",
    filter: "Tourist Attraction",
    description: "Discover landmarks and memorable places.",
  },
  {
    name: "Restaurants",
    icon: Utensils,
    color: "bg-rose-50 text-rose-700",
    filter: "restaurant",
    description: "Find places to eat and enjoy local cuisine.",
  },
  {
    name: "Hotels",
    icon: Hotel,
    color: "bg-blue-50 text-blue-700",
    filter: "hotel",
    description: "Explore accommodation options for your stay.",
  },
  {
    name: "Parks & Nature",
    icon: Trees,
    color: "bg-green-50 text-green-700",
    filter: "park",
    description: "Experience landscapes and outdoor escapes.",
  },
  {
    name: "Events",
    icon: CalendarDays,
    color: "bg-purple-50 text-purple-700",
    filter: "event",
    description: "Discover events around Kaduna.",
  },
  {
    name: "Cafés",
    icon: Coffee,
    color: "bg-amber-50 text-amber-700",
    filter: "cafe",
    description: "Find welcoming spots to relax and connect.",
  },
];

// ============================================
// HOMEPAGE DESTINATIONS
// ============================================

// Temporary compatibility export for the current page.js.
// This is empty until the homepage fetches records from the API.
export const destinations = [];

export function getHomeDestinations(apiDestinations = []) {
  if (!Array.isArray(apiDestinations)) return [];

  return apiDestinations.filter(
    (destination) =>
      destination &&
      typeof destination === "object" &&
      destination.isPublished !== false,
  );
}

// ============================================
// ESSENTIAL SERVICES
// ============================================

export const services = [
  {
    name: "Hospitals & Clinics",
    icon: Stethoscope,
    color: "bg-emerald-50 text-emerald-700",
    filter: "hospital",
    description: "Find nearby healthcare facilities.",
  },
  {
    name: "Pharmacies",
    icon: ShieldCheck,
    color: "bg-orange-50 text-orange-700",
    filter: "pharmacy",
    description: "Find pharmacies and medicine providers.",
  },
  {
    name: "Banks & ATMs",
    icon: Landmark,
    color: "bg-blue-50 text-blue-700",
    filter: "bank",
    description: "Locate banks and cash points.",
  },
  {
    name: "Fuel Stations",
    icon: Fuel,
    color: "bg-amber-50 text-amber-700",
    filter: "fuel-station",
    description: "Find fuel stations along your journey.",
  },
  {
    name: "Schools",
    icon: GraduationCap,
    color: "bg-violet-50 text-violet-700",
    filter: "school",
    description: "Discover educational institutions.",
  },
  {
    name: "Hotels",
    icon: Hotel,
    color: "bg-cyan-50 text-cyan-700",
    filter: "hotel",
    description: "Find accommodation across Kaduna State.",
  },
];

// ============================================
// DESTINATION FILTERS
// ============================================

export const destinationFilters = [
  "all",
  "attraction",
  "restaurant",
  "hotel",
  "cafe",
  "park",
  "nature",
  "culture",
  "cultural-site",
  "historical-site",
  "shopping",
  "entertainment",
  "sports",
  "event",
  "other",
];

// ============================================
// MOBILE NAVIGATION
// ============================================

export const mobileNavigation = [
  {
    label: "Home",
    icon: Compass,
    href: "/",
    key: "home",
  },
  {
    label: "Explore",
    icon: Search,
    href: "/explore",
    key: "explore",
  },
  {
    label: "Saved",
    icon: Heart,
    href: "/dashboard",
    key: "saved",
  },
  {
    label: "Services",
    icon: Building2,
    href: "/explore",
    key: "services",
  },
];

// ============================================
// HOMEPAGE HERO
// ============================================

export const heroContent = {
  eyebrow: "YOUR GUIDE TO KADUNA STATE",
  title: "Find your next",
  highlight: "Kaduna experience.",
  description:
    "Discover remarkable destinations, local food, places to stay, cultural experiences, exciting events and essential services across Kaduna State.",
  backgroundImage: "/assets/images/backgrounds/kaduna-hero.png",
  primaryAction: {
    label: "Explore Kaduna",
    href: "/explore",
  },
  secondaryAction: {
    label: "Discover our story",
    href: "/#about",
  },
};

// ============================================
// ABOUT KADUNA EXPLORER
// ============================================

export const aboutContent = {
  eyebrow: "ABOUT KADUNA EXPLORER",
  title: "See Kaduna from a new perspective.",
  description:
    "Kaduna Explorer is a digital tourism and discovery platform designed to help people discover the places, culture, experiences and everyday essentials that make Kaduna State special.",

  paragraphs: [
    "From remarkable landscapes and cultural landmarks to local restaurants, comfortable places to stay and events worth attending, Kaduna Explorer brings useful destination information together in one accessible place.",
    "Whether you are planning a visit, exploring your own city, travelling across the state or looking for somewhere new to experience, our goal is to make discovering Kaduna simpler, more informative and more enjoyable.",
    "We also aim to give local businesses, hospitality providers and destination managers a digital space to showcase their offerings, helping more people discover what Kaduna has to offer.",
  ],

  mission: {
    title: "Our mission",
    description:
      "To make Kaduna State easier to discover by connecting people with useful information about destinations, culture, hospitality and local experiences.",
    icon: Compass,
  },

  vision: {
    title: "Our vision",
    description:
      "To become a trusted digital guide to Kaduna State, supporting tourism discovery, local visibility and connections between visitors, residents and local businesses.",
    icon: Sparkles,
  },

  values: [
    {
      title: "Local discovery",
      description:
        "Help people find places and experiences across Kaduna State.",
      icon: MapPin,
    },
    {
      title: "Culture and heritage",
      description:
        "Celebrate the stories, traditions and places that shape Kaduna.",
      icon: Camera,
    },
    {
      title: "Community connection",
      description: "Help visitors, residents and local businesses connect.",
      icon: Users,
    },
    {
      title: "Useful information",
      description:
        "Bring destination details and travel inspiration into one accessible platform.",
      icon: BookOpen,
    },
  ],

  closingTitle: "Your next Kaduna experience starts here.",
  closingDescription:
    "Explore somewhere new, learn something about the state or find a place worth visiting. There is always more to discover.",

  closingAction: {
    label: "Start exploring",
    href: "/explore",
    icon: Navigation,
  },
};

// ============================================
// BRAND INFORMATION
// ============================================

export const brandContent = {
  name: "Kaduna Explorer",
  tagline: "Discover. Explore. Experience.",
  location: "Kaduna State, Nigeria",
  description:
    "Your digital guide to discovering destinations, culture, hospitality, local experiences and essential services across Kaduna State.",
};

// ============================================
// HOMEPAGE SECTION CONTENT
// ============================================

export const homepageSections = {
  featured: {
    eyebrow: "PLACES WORTH DISCOVERING",
    title: "Explore Kaduna",
    description:
      "Find interesting places, explore new experiences and discover destinations across the state.",
    actionLabel: "View all destinations",
    actionHref: "/explore",
  },

  categories: {
    eyebrow: "FIND YOUR INTEREST",
    title: "What would you like to discover?",
    description:
      "Browse destinations by category and find experiences that match your interests.",
  },

  services: {
    eyebrow: "EVERYDAY ESSENTIALS",
    title: "More than tourism",
    description:
      "Kaduna Explorer is designed to help you discover useful local services as well as places to visit.",
  },

  about: {
    eyebrow: "OUR STORY",
    title: "Discover more than a destination",
    description:
      "Kaduna is a place of diverse landscapes, rich heritage, local enterprise and everyday experiences. Kaduna Explorer brings these discoveries closer to you.",
    actionLabel: "Learn more about us",
    actionHref: "/#about",
  },
};

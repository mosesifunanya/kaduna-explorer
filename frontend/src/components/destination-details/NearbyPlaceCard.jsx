"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import OptimizedImage from "@/components/OptimizedImage";
import {
  ArrowUpRight,
  Clock3,
  MapPin,
  Navigation,
  ExternalLink,
} from "lucide-react";

import {
  formatDistance,
  getDirectionsUrl,
} from "@/lib/destinationDetailsPageUtils";

function getCategoryPlaceholder(place) {
  const categoryText = [
    place?.name,
    place?.category,
    place?.categoryLabel,
    place?.primaryType,
    ...(Array.isArray(place?.types) ? place.types : []),
    ...(Array.isArray(place?.properties?.categories)
      ? place.properties.categories
      : []),
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  const placeholders = [
    {
      keywords: [
        "beauty",
        "personal care",
        "salon",
        "hairdresser",
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
    keywords.some((keyword) => categoryText.includes(keyword)),
  );

  const filename =
    match?.image ?? "kaduna-explorer-general-other-placeholder.png";

  return `/assets/images/placeholders/${filename}`;
}

export default function NearbyPlaceCard({ place = {} }) {
  const [imageError, setImageError] = useState(false);

  const name = place.name || "Unnamed place";

  const address = typeof place.address === "string" ? place.address : "";

  const category = String(place.category || "place")
    .replace(/[-_]/g, " ")
    .trim();

  const image =
    typeof place.image === "string" && /^https?:\/\//i.test(place.image)
      ? place.image
      : "";

  const placeholder = getCategoryPlaceholder(place);

  const directionsUrl = getDirectionsUrl(place);

  const osmUrl =
    typeof place.osmUrl === "string" &&
    /^https:\/\/www\.openstreetmap\.org\//i.test(place.osmUrl)
      ? place.osmUrl
      : "";

  const distance = formatDistance(place.distanceMeters);

  useEffect(() => {
    setImageError(false);
  }, [image, placeholder]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E8EAE3] bg-white shadow-[0_3px_14px_rgba(23,75,53,0.035)] transition-shadow duration-300 hover:shadow-[0_14px_35px_rgba(23,75,53,0.11)] sm:rounded-[22px]"
    >
      {/* Place photograph and category placeholder */}
      <div className="relative h-32 overflow-hidden bg-[#EDF2EB] sm:h-40 lg:h-44">
        <OptimizedImage
          src={placeholder}
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {image && !imageError && (
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}

        {/* Image overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#102D20]/55 via-transparent to-[#102D20]/5" />

        {/* Distance */}
        {distance && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[#173F30]/85 px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-sm backdrop-blur-md sm:text-[10px]">
            <Navigation size={11} />
            {distance} away
          </div>
        )}

        {/* Category */}
        <span className="absolute right-3 top-3 max-w-[65%] truncate rounded-full border border-white/60 bg-white/90 px-2.5 py-1.5 text-[9px] font-bold capitalize tracking-wide text-[#174B35] shadow-sm backdrop-blur-md sm:text-[10px]">
          {category}
        </span>
      </div>

      {/* Place information */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-[family-name:var(--font-playfair)] text-[15px] font-semibold leading-5 text-[#173F30] transition-colors group-hover:text-[#A87912] sm:text-lg sm:leading-6">
            {name}
          </h3>

          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-[1.6] text-[#818A80] sm:text-xs">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[#A87912]" />

            <span className="line-clamp-2 break-words">
              {address || "Address details are not available."}
            </span>
          </p>

          {place.openingHours && (
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-5 text-[#68796D] sm:text-xs">
              <Clock3 size={13} className="mt-0.5 shrink-0 text-[#A87912]" />

              <span className="line-clamp-2">{place.openingHours}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-[#EDF0EA] pt-3">
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get directions to ${name}`}
              className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#174B35] px-2.5 py-2 text-[10px] font-semibold text-white transition-all duration-200 hover:bg-[#103B29] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] focus-visible:ring-offset-2 sm:gap-2 sm:text-xs"
            >
              <Navigation size={13} />
              Directions
              <ArrowUpRight
                size={12}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          )}

          {osmUrl && (
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${name} on OpenStreetMap`}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#E5EAE3] bg-white px-3 py-2 text-[10px] font-semibold text-[#536357] transition-colors hover:border-[#B8CDBA] hover:bg-[#F4F7F2] sm:text-xs"
            >
              <ExternalLink size={12} />
              Map
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Images, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import DestinationFavorite from "@/components/destination-details/DestinationFavorite";
import OptimizedImage from "@/components/OptimizedImage";

export default function DestinationCard({ destination = {}, href }) {
  const shouldReduceMotion = useReducedMotion();

  const destinationId = destination.slug || destination.id || destination._id;

  const destinationHref =
    href ||
    (destinationId
      ? `/explore/${encodeURIComponent(String(destinationId))}`
      : "/explore");

  const coverImage =
    (typeof destination.coverImage === "string"
      ? destination.coverImage.trim()
      : typeof destination.coverImage?.url === "string"
        ? destination.coverImage.url.trim()
        : "") ||
    (typeof destination.image === "string" ? destination.image.trim() : "");

  const [imageFailed, setImageFailed] = useState(false);

  const category = String(
    destination.categoryLabel || destination.category || "Destination",
  ).replaceAll("-", " ");

  const location =
    destination.locationLabel ||
    (typeof destination.location === "string"
      ? destination.location.trim()
      : "") ||
    [destination.address, destination.lga, destination.city, destination.state]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim())
      .filter((value, index, array) => array.indexOf(value) === index)
      .join(", ") ||
    "Kaduna State";

  const name = destination.name || "Untitled destination";

  const description =
    destination.shortDescription ||
    destination.description ||
    "Discover more about this destination in Kaduna State.";

  const galleryCount = Array.isArray(destination.images)
    ? new Set(
        destination.images
          .map((image) => {
            if (typeof image === "string") {
              return image.trim();
            }

            return image?.url?.trim?.() || image?.secure_url?.trim?.() || "";
          })
          .filter(Boolean),
      ).size
    : 0;

  const hasFavoriteId = Boolean(destination._id || destination.id);

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -5 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E2EAE3] bg-white shadow-[0_3px_14px_rgba(16,60,42,0.045)] transition-[border-color,box-shadow] duration-300 ease-out hover:border-[#C9D9CD] hover:shadow-[0_16px_36px_rgba(16,60,42,0.13)]"
    >
      {/* Destination image */}

      <Link
        href={destinationHref}
        aria-label={`View details for ${name}`}
        className="group/image relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-[#E8EEE8] min-[400px]:aspect-[16/10] sm:aspect-[16/10]"
      >
        {coverImage && !imageFailed ? (
          <OptimizedImage
            src={coverImage}
            alt={name}
            fill
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            quality={75}
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover/image:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#103C2A] via-[#285D43] to-[#718C68]">
            <div className="px-3 text-center">
              <MapPin
                size={24}
                className="mx-auto mb-2 text-[#FFBD4A]"
                aria-hidden="true"
              />

              <span className="text-xs font-medium text-white/85">
                {imageFailed
                  ? "Destination photo unavailable"
                  : "Destination image coming soon"}
              </span>
            </div>
          </div>
        )}

        {/* Image gradient */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        />

        {/* Category badge */}

        <span className="absolute right-2 top-2 z-10 max-w-[75%] truncate rounded-full border border-white/25 bg-black/35 px-2 py-1 text-[8px] font-semibold capitalize text-white shadow-sm backdrop-blur-md transition-colors duration-300 group-hover/image:bg-black/50 sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
          {category}
        </span>

        {/* Destination name */}

        <div className="absolute inset-x-2.5 bottom-1.5 sm:inset-x-4 sm:bottom-3">
          <h3 className="line-clamp-2 max-w-[95%] text-[12px] font-extrabold leading-[1.25] tracking-tight text-white transition-transform duration-300 group-hover/image:translate-y-[-2px] min-[400px]:text-[13px] sm:text-lg sm:leading-tight">
            {name}
          </h3>
        </div>
      </Link>

      {/* Save destination button */}

      {hasFavoriteId && (
        <div className="absolute left-2 top-2 z-20 sm:left-3 sm:top-3">
          <DestinationFavorite destination={destination} variant="compact" />
        </div>
      )}

      {/* Destination details */}

      <div className="flex flex-1 flex-col p-2.5 min-[400px]:p-3 sm:p-4">
        {/* Location */}

        <p className="flex min-w-0 items-start gap-1.5 text-[10px] font-medium leading-4 text-[#687B91] transition-colors duration-300 group-hover:text-[#526B8A] sm:gap-2 sm:text-xs sm:leading-5">
          <MapPin
            size={13}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-[#087747]"
            aria-hidden="true"
          />

          <span className="line-clamp-2 break-words">{location}</span>
        </p>

        {/* Description */}

        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#526B8A] transition-colors duration-300 group-hover:text-[#405D7C] sm:mt-3 sm:text-sm sm:leading-6">
          {description}
        </p>

        {/* Gallery action */}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF1ED] pt-3 sm:mt-4">
          <span className="text-[9px] font-semibold text-[#758477] sm:text-xs">
            {galleryCount > 0 ? `${galleryCount} photos` : "Destination guide"}
          </span>

          <Link
            href={destinationHref}
            aria-label={`Discover the photo gallery for ${name}`}
            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-[#FFF4D8] px-2 py-1.5 text-[10px] font-extrabold text-[#80520A] ring-1 ring-inset ring-[#F0D79D] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#FFBD4A] hover:text-[#103C2A] hover:shadow-md active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B78319] min-[400px]:gap-1.5 min-[400px]:px-2.5 sm:min-h-9 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm"
          >
            <Images
              size={14}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:rotate-[-6deg]"
            />

            <span className="sm:hidden">Gallery</span>

            <span className="hidden sm:inline">Discover Gallery</span>

            <ArrowRight
              size={13}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

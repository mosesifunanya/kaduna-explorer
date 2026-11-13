"use client";

import { motion } from "motion/react";

import DestinationGallery from "@/components/destination-details/DestinationGallery";
import DestinationOverview from "@/components/destination-details/DestinationOverview";
import DestinationMap from "@/components/destination-details/DestinationMap";
import NearbySearchPanel from "@/components/destination-details/NearbySearchPanel";
import DestinationVisitorInfo from "@/components/destination-details/DestinationVisitorInfo";
import DestinationSectionNav from "@/components/destination-details/DestinationSectionNav";
import RelatedDestinations from "@/components/destination-details/RelatedDestinations";
import DestinationReviews from "@/components/destination-details/DestinationReviews";

/**
 * Extract destination coordinates from MongoDB GeoJSON.
 *
 * GeoJSON coordinates are stored in this order:
 * [longitude, latitude]
 *
 * Also supports separate latitude/longitude fields.
 */
function getDestinationCoordinates(destination = {}) {
  const coordinates = destination?.location?.coordinates;

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return {
        latitude,
        longitude,
      };
    }
  }

  const rawLatitude = destination?.latitude ?? destination?.location?.latitude;

  const rawLongitude =
    destination?.longitude ?? destination?.location?.longitude;

  if (
    rawLatitude === null ||
    rawLatitude === undefined ||
    rawLongitude === null ||
    rawLongitude === undefined ||
    rawLatitude === "" ||
    rawLongitude === ""
  ) {
    return null;
  }

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return {
      latitude,
      longitude,
    };
  }

  return null;
}

/**
 * Get the actual destination cover image.
 *
 * Supports string and object-based coverImage values,
 * and falls back to the destination's gallery images.
 */
function getDestinationCoverImage(destination = {}) {
  const coverImage = destination?.coverImage;

  if (typeof coverImage === "string" && coverImage.trim()) {
    return coverImage.trim();
  }

  if (typeof coverImage?.url === "string" && coverImage.url.trim()) {
    return coverImage.url.trim();
  }

  if (
    typeof coverImage?.secure_url === "string" &&
    coverImage.secure_url.trim()
  ) {
    return coverImage.secure_url.trim();
  }

  if (Array.isArray(destination?.images)) {
    const selectedImage =
      destination.images.find((image) => image?.isCover || image?.cover) ||
      destination.images[0];

    if (typeof selectedImage === "string" && selectedImage.trim()) {
      return selectedImage.trim();
    }

    if (typeof selectedImage?.url === "string" && selectedImage.url.trim()) {
      return selectedImage.url.trim();
    }

    if (
      typeof selectedImage?.secure_url === "string" &&
      selectedImage.secure_url.trim()
    ) {
      return selectedImage.secure_url.trim();
    }
  }

  if (typeof destination?.image === "string" && destination.image.trim()) {
    return destination.image.trim();
  }

  return "";
}

export default function DestinationDetailsMain({
  destination,
  gallery,
  activeImage,
  setActiveImage,
  setViewerOpen,
  categoryLabel,
  locationLabel,
  directionsToDestination,
  copied,
  shareDestination,
  mapEmbedUrl,
  nearbySearchProps,
  priceLabel,
  phone,
  email,
  websiteUrl,
  relatedDestinations = [],
}) {
  const destinationCoordinates = getDestinationCoordinates(destination);

  const destinationImage = getDestinationCoverImage(destination);

  const destinationLocation =
    locationLabel ||
    destination?.address ||
    [destination?.city, destination?.lga, destination?.state]
      .filter(Boolean)
      .join(", ");

  return (
    <div className="min-w-0 w-full">
      {/* Hero gallery */}
      <motion.div
        id="destination-gallery"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: "easeOut",
        }}
      >
        <DestinationGallery
          destination={destination}
          gallery={gallery}
          activeImage={activeImage}
          setActiveImage={setActiveImage}
          onOpenGallery={() => setViewerOpen(true)}
        />
      </motion.div>

      {/* Destination overview */}
      <div id="destination-overview" className="scroll-mt-24">
        <DestinationOverview
          destination={destination}
          categoryLabel={categoryLabel}
          locationLabel={locationLabel}
          directionsUrl={directionsToDestination}
          copied={copied}
          onShare={shareDestination}
        />
      </div>

      {/* Section navigation */}
      <DestinationSectionNav />

      {/* Visitor information */}
      <motion.section
        id="visitor-information"
        className="scroll-mt-24 mt-8 sm:mt-10"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{
          once: true,
          amount: 0.1,
        }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-5 sm:mb-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A87912] sm:text-[10px]">
            Plan your visit
          </p>

          <h2 className="mt-2 font-serif text-xl font-bold leading-tight text-[#173F30] sm:text-2xl lg:text-3xl">
            Everything you need to know
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-6 text-[#78827B] sm:text-sm sm:leading-7">
            Find useful visitor information, explore the location and plan your
            journey before visiting {destination.name}.
          </p>
        </div>

        {/* Map and visitor information */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-6">
          {/* Destination map */}
          <div id="destination-map" className="scroll-mt-24 min-w-0">
            <DestinationMap
              destinationName={destination.name}
              latitude={destinationCoordinates?.latitude}
              longitude={destinationCoordinates?.longitude}
              mapEmbedUrl={mapEmbedUrl}
              directionsUrl={directionsToDestination}
              destinationImage={destinationImage}
              location={destinationLocation}
            />
          </div>

          {/* Visitor information card */}
          <div className="min-w-0">
            <DestinationVisitorInfo
              locationLabel={locationLabel}
              categoryLabel={categoryLabel}
              priceLabel={priceLabel}
              openingHours={destination.openingHours}
              phone={phone}
              email={email}
              websiteUrl={websiteUrl}
              directionsToDestination={directionsToDestination}
            />
          </div>
        </div>
      </motion.section>

      {/* Nearby places */}
      <motion.section
        id="nearby-places"
        className="scroll-mt-24 mt-8 sm:mt-10"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{
          once: true,
          amount: 0.08,
        }}
        transition={{ duration: 0.5 }}
      >
        <NearbySearchPanel destination={destination} {...nearbySearchProps} />
      </motion.section>

      {/* Reviews and ratings */}
      <DestinationReviews destination={destination} />

      {/* Related destinations */}
      <RelatedDestinations relatedDestinations={relatedDestinations} />
    </div>
  );
}

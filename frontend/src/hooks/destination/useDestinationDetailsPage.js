"use client";

import { useRef } from "react";

import useDestinationDetails from "@/hooks/destination/useDestinationDetails";
import useDestinationGallery from "@/hooks/destination/useDestinationGallery";
import useDestinationLocation from "@/hooks/destination/useDestinationLocation";
import useDestinationNearbySearch from "@/hooks/destination/useDestinationNearbySearch";

import { getLocation, getWebsiteUrl } from "@/lib/destinationDetailsPageUtils";

import { getDestinationCategoryLabel } from "@/lib/destinationCategories";

export default function useDestinationDetailsPage(slug) {
  // Load the destination and related destinations.
  const {
    destination,
    loading,
    error,
    setError,
    notFound,
    loadDestination,
    gallery,
    destinationCoordinates,
    relatedDestinations,
  } = useDestinationDetails(slug);

  // These refs connect the location hook to the nearby-search hook
  // without duplicating either hook's state.
  const nearbyHandlers = useRef({
    handleLocationEnabled: null,
    handleLocationDisabled: null,
  });

  // Destination GPS and Kaduna boundary validation.
  const location = useDestinationLocation({
    onLocationEnabled: () => {
      nearbyHandlers.current.handleLocationEnabled?.();
    },
    onLocationDisabled: () => {
      nearbyHandlers.current.handleLocationDisabled?.();
    },
  });

  // Gallery viewer, active image and sharing.
  const galleryState = useDestinationGallery({
    destination,
    gallery,
    setError,
  });

  // Nearby places search using either destination coordinates or GPS.
  const nearbySearch = useDestinationNearbySearch({
    destination,
    destinationCoordinates,
    slug,
    gpsEnabled: location.gpsEnabled,
    visitorLocation: location.visitorLocation,
    setGpsEnabled: location.setGpsEnabled,
    setVisitorLocation: location.setVisitorLocation,
    setLocationError: location.setLocationError,
    setShowOutsideKadunaModal: location.setShowOutsideKadunaModal,
  });

  // Register the location callbacks after the nearby-search hook exists.
  nearbyHandlers.current.handleLocationEnabled =
    nearbySearch.handleLocationEnabled;

  nearbyHandlers.current.handleLocationDisabled =
    nearbySearch.handleLocationDisabled;

  // Destination information used by the page and its components.
  const websiteUrl = destination
    ? getWebsiteUrl(destination.website || destination.websiteUrl)
    : "";

  const phone = destination
    ? destination.phone || destination.contactPhone || ""
    : "";

  const email = destination
    ? destination.email || destination.contactEmail || ""
    : "";

  const categoryLabel = destination
    ? getDestinationCategoryLabel(destination)
    : "";

  const locationLabel = destination ? getLocation(destination) : "";

  const priceLabel = destination
    ? destination.priceRange ||
      destination.entranceFee ||
      destination.price ||
      "unknown"
    : "unknown";

  // Map and directions use the destination's saved coordinates.
  const mapEmbedUrl = destinationCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        destinationCoordinates.longitude - 0.02
      }%2C${destinationCoordinates.latitude - 0.02}%2C${
        destinationCoordinates.longitude + 0.02
      }%2C${destinationCoordinates.latitude + 0.02}&layer=mapnik&marker=${
        destinationCoordinates.latitude
      }%2C${destinationCoordinates.longitude}`
    : "";

  const directionsToDestination = destinationCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${
        destinationCoordinates.latitude
      },${destinationCoordinates.longitude}`
    : "";

  return {
    // Destination data.
    destination,
    loading,
    error,
    setError,
    notFound,
    loadDestination,
    gallery,
    destinationCoordinates,
    relatedDestinations,

    // Gallery and sharing.
    activeImage: galleryState.activeImage,
    setActiveImage: galleryState.setActiveImage,
    viewerOpen: galleryState.viewerOpen,
    setViewerOpen: galleryState.setViewerOpen,
    copied: galleryState.copied,
    shareDestination: galleryState.shareDestination,

    // Visitor location.
    visitorLocation: location.visitorLocation,
    gpsEnabled: location.gpsEnabled,
    locationError: location.locationError,
    locationLoading: location.locationLoading,
    showOutsideKadunaModal: location.showOutsideKadunaModal,
    setShowOutsideKadunaModal: location.setShowOutsideKadunaModal,
    requestVisitorLocation: location.requestVisitorLocation,
    disableVisitorLocation: location.disableVisitorLocation,

    // Nearby search.
    ...nearbySearch,

    // Destination display information.
    websiteUrl,
    phone,
    email,
    categoryLabel,
    locationLabel,
    priceLabel,
    mapEmbedUrl,
    directionsToDestination,
  };
}

"use client";

import { useCallback, useRef, useState } from "react";

import { apiRequest } from "@/lib/api";

export default function useDestinationLocation({
  onLocationEnabled,
  onLocationDisabled,
}) {
  const [visitorLocation, setVisitorLocation] = useState(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [showOutsideKadunaModal, setShowOutsideKadunaModal] = useState(false);

  const gpsRequestId = useRef(0);

  const disableVisitorLocation = useCallback(() => {
    gpsRequestId.current += 1;

    setGpsEnabled(false);
    setVisitorLocation(null);
    setLocationError("");
    setLocationLoading(false);

    onLocationDisabled?.();
  }, [onLocationDisabled]);

  const requestVisitorLocation = useCallback(() => {
    setLocationError("");

    if (!navigator.geolocation) {
      setGpsEnabled(false);
      setVisitorLocation(null);

      setLocationError(
        "Your browser does not support location access. You can still search around this destination.",
      );

      return;
    }

    const requestId = ++gpsRequestId.current;

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (requestId !== gpsRequestId.current) return;

        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        try {
          const validationParams = new URLSearchParams({
            lat: String(location.latitude),
            lon: String(location.longitude),
          });

          await apiRequest(
            `destinations/validate-location?${validationParams.toString()}`,
          );

          if (requestId !== gpsRequestId.current) return;

          setVisitorLocation(location);
          setGpsEnabled(true);
          setLocationLoading(false);
          setLocationError("");

          // GPS activation selects the origin but never starts a search.
          onLocationEnabled?.(location);
        } catch (err) {
          if (requestId !== gpsRequestId.current) return;

          setLocationLoading(false);
          setGpsEnabled(false);
          setVisitorLocation(null);

          if (/outside kaduna state/i.test(err?.message || "")) {
            setLocationError("");
            setShowOutsideKadunaModal(true);
            return;
          }

          console.error("GPS boundary validation error:", err);

          setLocationError(
            "We could not verify that your location is within Kaduna State. GPS has not been enabled. Please try again, or continue searching around this destination.",
          );
        }
      },
      (err) => {
        if (requestId !== gpsRequestId.current) return;

        setLocationLoading(false);
        setGpsEnabled(false);
        setVisitorLocation(null);

        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Location permission was denied. Allow location access in your browser settings, or search around this destination.",
          );
        } else if (err.code === err.TIMEOUT) {
          setLocationError(
            "Getting your location took too long. Please try again.",
          );
        } else {
          setLocationError(
            "We could not determine your location. Please try again or search around this destination.",
          );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }, [onLocationEnabled]);

  const resetLocation = useCallback(() => {
    gpsRequestId.current += 1;

    setVisitorLocation(null);
    setGpsEnabled(false);
    setLocationError("");
    setLocationLoading(false);
    setShowOutsideKadunaModal(false);
  }, []);

  return {
    visitorLocation,
    setVisitorLocation,
    gpsEnabled,
    setGpsEnabled,
    locationError,
    setLocationError,
    locationLoading,
    setLocationLoading,
    showOutsideKadunaModal,
    setShowOutsideKadunaModal,
    gpsRequestId,
    requestVisitorLocation,
    disableVisitorLocation,
    resetLocation,
  };
}

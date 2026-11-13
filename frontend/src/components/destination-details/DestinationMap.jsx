"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import {
  ExternalLink,
  Layers,
  Map as MapIcon,
  MapPin,
  Navigation,
  LocateFixed,
  Plus,
  Minus,
  LoaderCircle,
  CarFront,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

const MAP_LAYERS = {
  standard: {
    name: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    maxZoom: 19,
  },
  humanitarian: {
    name: "Detailed",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    maxZoom: 19,
  },
};

const sectionVariants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function getGoogleDirectionsUrl(latitude, longitude) {
  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&destination=${latitude},${longitude}`
  );
}

/**
 * Shorten an address dynamically while preserving original spelling and order.
 * Remove empty and case-insensitive duplicate sections, showing at most 3.
 * The original address is never modified.
 */
function formatPopupAddress(address = "") {
  if (typeof address !== "string" || !address.trim()) {
    return "";
  }

  const seen = new Set();

  return address
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => {
      if (!part) return false;

      const normalized = part.toLocaleLowerCase();

      if (seen.has(normalized)) return false;

      seen.add(normalized);
      return true;
    })
    .slice(0, 3)
    .join(", ");
}

function createDestinationIcon(L) {
  return L.divIcon({
    className: "kaduna-destination-marker-wrapper",
    html: `
      <div class="kaduna-destination-marker">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 13.5L16 5L27 13.5V27H5V13.5Z" fill="white"/>
          <path d="M3 14L16 3L29 14" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 27V17H20V27" fill="#174B35"/>
          <path d="M14 17V13H18V17" fill="#174B35"/>
        </svg>
      </div>
    `,
    iconSize: [44, 54],
    iconAnchor: [22, 50],
    popupAnchor: [0, -48],
  });
}

function createPopupContent(destinationName, destinationImage, location) {
  const container = document.createElement("div");
  container.className = "kaduna-map-popup-content";

  if (destinationImage) {
    const image = document.createElement("img");

    image.src = destinationImage;
    image.alt = destinationName;
    image.className = "kaduna-map-popup-image";
    image.loading = "lazy";

    container.appendChild(image);
  }

  const details = document.createElement("div");
  details.className = "kaduna-map-popup-details";

  const title = document.createElement("h3");
  title.textContent = destinationName;

  details.appendChild(title);

  const shortAddress = formatPopupAddress(location);

  if (shortAddress) {
    const address = document.createElement("p");

    address.textContent = shortAddress;
    address.title = location;

    details.appendChild(address);
  }

  container.appendChild(details);

  return container;
}

export default function DestinationMap({
  destinationName = "Destination",
  latitude,
  longitude,
  mapEmbedUrl = "",
  directionsUrl = "",
  destinationImage = "",
  location = "",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);

  const shouldReduceMotion = useReducedMotion();

  const [activeLayer, setActiveLayer] = useState("standard");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  const lat = Number(latitude);
  const lng = Number(longitude);

  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    String(latitude).trim() !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    String(longitude).trim() !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  const destinationDirectionsUrl =
    directionsUrl || (hasCoordinates ? getGoogleDirectionsUrl(lat, lng) : "");

  const formattedCoordinates = hasCoordinates
    ? `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`
    : "";

  // Initialize Leaflet.
  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) return;

    let cancelled = false;
    let observer;
    let animationFrame;

    async function initializeMap() {
      try {
        const L = await import("leaflet");

        if (cancelled || !mapContainerRef.current) return;

        leafletRef.current = L;

        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 14,
          minZoom: 3,
          maxZoom: 19,
          zoomControl: false,
          scrollWheelZoom: true,
          attributionControl: true,
        });

        mapInstanceRef.current = map;

        const layer = MAP_LAYERS.standard;

        const tileLayer = L.tileLayer(layer.url, {
          attribution: layer.attribution,
          maxZoom: layer.maxZoom,
          subdomains: "abc",
        });

        tileLayer.addTo(map);
        tileLayerRef.current = tileLayer;

        const marker = L.marker([lat, lng], {
          icon: createDestinationIcon(L),
          keyboard: true,
          title: destinationName,
          alt: destinationName,
        }).addTo(map);

        marker.bindPopup(
          createPopupContent(destinationName, destinationImage, location),
          {
            closeButton: true,
            autoPan: true,
            maxWidth: 230,
            minWidth: destinationImage ? 175 : 145,
            className: "kaduna-destination-popup",
          },
        );

        markerRef.current = marker;
        marker.openPopup();

        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => {
            map.invalidateSize({
              pan: false,
            });
          });

          observer.observe(mapContainerRef.current);
        }

        if (!cancelled) {
          setMapReady(true);
          setMapError("");
        }

        animationFrame = requestAnimationFrame(() => {
          map.invalidateSize();
        });
      } catch (error) {
        console.error("Destination map initialization failed:", error);

        if (!cancelled) {
          setMapError("We couldn't load the map. Please try again.");
        }
      }
    }

    initializeMap();

    return () => {
      cancelled = true;

      observer?.disconnect();

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, [hasCoordinates, lat, lng, destinationName, destinationImage, location]);

  // Switch OpenStreetMap tile styles.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    if (!L || !map || !tileLayerRef.current) return;

    const selectedLayer = MAP_LAYERS[activeLayer];

    if (!selectedLayer) return;

    const nextLayer = L.tileLayer(selectedLayer.url, {
      attribution: selectedLayer.attribution,
      maxZoom: selectedLayer.maxZoom,
      subdomains: "abc",
    });

    nextLayer.addTo(map);

    const previousLayer = tileLayerRef.current;
    tileLayerRef.current = nextLayer;

    previousLayer.remove();
  }, [activeLayer, mapReady]);

  const recenterMap = useCallback(() => {
    const map = mapInstanceRef.current;

    if (!map || !hasCoordinates) return;

    map.flyTo([lat, lng], 15, {
      duration: shouldReduceMotion ? 0 : 0.8,
    });

    markerRef.current?.openPopup();
  }, [hasCoordinates, lat, lng, shouldReduceMotion]);

  const zoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn(shouldReduceMotion ? 0 : 0.25);
  }, [shouldReduceMotion]);

  const zoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut(shouldReduceMotion ? 0 : 0.25);
  }, [shouldReduceMotion]);

  const animationProps = shouldReduceMotion
    ? {
        initial: false,
      }
    : {
        initial: "hidden",
        whileInView: "visible",
        viewport: {
          once: true,
          amount: 0.12,
        },
        variants: sectionVariants,
      };

  const itemAnimationProps = shouldReduceMotion
    ? {
        initial: false,
      }
    : {
        variants: itemVariants,
      };

  return (
    <>
      <motion.section {...animationProps} className="w-full min-w-0">
        {/* Map heading */}
        <motion.div
          {...itemAnimationProps}
          className="mb-3 flex flex-col gap-2.5 sm:mb-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF2E9] text-[#174B35] sm:h-11 sm:w-11 sm:rounded-2xl">
              <MapIcon size={19} strokeWidth={1.9} />
            </div>

            <div className="min-w-0">
              <h3 className="font-[family-name:var(--font-playfair)] text-[17px] font-bold leading-tight text-[#174B35] sm:text-xl lg:text-2xl">
                Find us on the map
              </h3>

              <p className="mt-0.5 text-[10px] leading-4 text-[#78847B] sm:text-xs">
                Explore the location and nearby surroundings
              </p>
            </div>
          </div>
        </motion.div>

        {/* Interactive map */}
        <motion.div
          {...itemAnimationProps}
          className="relative isolate w-full overflow-hidden rounded-2xl border border-[#E3E9DF] bg-[#EAF0E5] shadow-[0_6px_22px_rgba(23,75,53,0.07)] transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(23,75,53,0.11)] sm:rounded-[20px]"
        >
          {!hasCoordinates ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-5 text-center sm:min-h-[320px] md:min-h-[360px]">
              <MapPin size={28} className="text-[#B88B1C]" />

              <h4 className="text-sm font-bold text-[#174B35]">
                Location unavailable
              </h4>

              <p className="max-w-xs text-[11px] leading-5 text-[#78847B]">
                Coordinates have not been provided for this destination.
              </p>
            </div>
          ) : (
            <>
              <div
                ref={mapContainerRef}
                role="application"
                aria-label={`Interactive map showing ${destinationName}`}
                className={`
                  z-0 w-full
                  h-[240px]
                  min-[360px]:h-[260px]
                  min-[393px]:h-[280px]
                  sm:h-[320px]
                  md:h-[360px]
                  lg:h-[400px]
                  xl:h-[430px]
                `}
              />

              {!mapReady && !mapError && (
                <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#EDF2E9]/90">
                  <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#174B35] shadow-lg sm:text-xs">
                    <LoaderCircle size={15} className="animate-spin" />
                    Loading map...
                  </div>
                </div>
              )}

              {mapError && (
                <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-[#F4F6F0] px-5 text-center">
                  <MapPin size={26} className="text-[#A87912]" />

                  <p className="text-xs font-semibold text-[#174B35]">
                    {mapError}
                  </p>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-[#174B35] px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#0F3927] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A21B] focus-visible:ring-offset-2"
                  >
                    Reload map
                  </button>
                </div>
              )}

              {mapReady && (
                <>
                  {/* Custom zoom and location controls */}
                  <div className="absolute left-2.5 top-2.5 z-[800] flex flex-col gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
                    <div className="overflow-hidden rounded-lg border border-[#E6EAE3] bg-white shadow-md sm:rounded-xl">
                      <motion.button
                        type="button"
                        onClick={zoomIn}
                        aria-label="Zoom in"
                        whileHover={
                          shouldReduceMotion
                            ? undefined
                            : { backgroundColor: "#EFF5ED" }
                        }
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.94 }
                        }
                        transition={{ duration: 0.2 }}
                        className="flex h-9 w-9 items-center justify-center text-[#174B35] sm:h-10 sm:w-10"
                      >
                        <Plus size={19} strokeWidth={2.4} />
                      </motion.button>

                      <div className="mx-1.5 border-t border-[#E9EDE7]" />

                      <motion.button
                        type="button"
                        onClick={zoomOut}
                        aria-label="Zoom out"
                        whileHover={
                          shouldReduceMotion
                            ? undefined
                            : { backgroundColor: "#EFF5ED" }
                        }
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.94 }
                        }
                        transition={{ duration: 0.2 }}
                        className="flex h-9 w-9 items-center justify-center text-[#174B35] sm:h-10 sm:w-10"
                      >
                        <Minus size={19} strokeWidth={2.4} />
                      </motion.button>
                    </div>

                    <motion.button
                      type="button"
                      onClick={recenterMap}
                      aria-label="Recenter destination on map"
                      title="Recenter destination"
                      whileHover={
                        shouldReduceMotion ? undefined : { y: -2, scale: 1.03 }
                      }
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.94 }
                      }
                      transition={{ duration: 0.2 }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E6EAE3] bg-white text-[#174B35] shadow-md transition-colors duration-200 hover:bg-[#EFF5ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A21B] sm:h-10 sm:w-10 sm:rounded-xl"
                    >
                      <LocateFixed size={18} />
                    </motion.button>
                  </div>

                  {/* Map layer selector */}
                  <div className="absolute right-2.5 top-2.5 z-[800] sm:right-4 sm:top-4">
                    <div className="flex overflow-hidden rounded-lg border border-[#E6EAE3] bg-white p-0.5 shadow-md sm:rounded-xl sm:p-1">
                      <motion.button
                        type="button"
                        onClick={() => setActiveLayer("standard")}
                        aria-pressed={activeLayer === "standard"}
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.96 }
                        }
                        className={`rounded-md px-2 py-1.5 text-[9px] font-bold transition-colors duration-200 sm:px-3 sm:py-2 sm:text-[10px] ${
                          activeLayer === "standard"
                            ? "bg-[#174B35] text-white"
                            : "text-[#53665A] hover:bg-[#EFF5ED]"
                        }`}
                      >
                        Standard
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => setActiveLayer("humanitarian")}
                        aria-pressed={activeLayer === "humanitarian"}
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.96 }
                        }
                        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[9px] font-bold transition-colors duration-200 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[10px] ${
                          activeLayer === "humanitarian"
                            ? "bg-[#174B35] text-white"
                            : "text-[#53665A] hover:bg-[#EFF5ED]"
                        }`}
                      >
                        <Layers size={11} />
                        Detailed
                      </motion.button>
                    </div>
                  </div>
                </>
              )}

              {/* Required OpenStreetMap attribution */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[700] flex justify-end p-1.5 sm:p-2">
                <span className="rounded bg-white/90 px-2 py-1 text-[8px] font-medium text-[#46564A] shadow-sm backdrop-blur-sm sm:text-[9px]">
                  © OpenStreetMap contributors
                </span>
              </div>
            </>
          )}
        </motion.div>

        {/* Coordinates and Google Maps directions */}
        {hasCoordinates && (
          <motion.div
            {...itemAnimationProps}
            className="mt-2.5 grid grid-cols-1 gap-2.5 rounded-2xl border border-[#E9ECE6] bg-white p-3 shadow-[0_5px_18px_rgba(23,75,53,0.045)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(23,75,53,0.08)] sm:mt-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:p-4 lg:grid-cols-[1fr_auto_auto] lg:gap-5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5EF] text-[#B88B1C] sm:h-10 sm:w-10">
                <MapPin size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#758B78] sm:text-[10px]">
                  Destination coordinates
                </p>

                <p className="mt-0.5 text-xs font-semibold text-[#24352B] sm:text-sm">
                  {formattedCoordinates}
                </p>
              </div>
            </div>

            <div className="hidden h-10 w-px bg-[#E5E9E2] lg:block" />

            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF5EF] text-[#174B35] sm:h-10 sm:w-10">
                <CarFront size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#758B78]">
                  Navigation
                </p>

                <p className="mt-0.5 text-[10px] text-[#68776C] sm:text-xs">
                  Open directions in Google Maps
                </p>
              </div>
            </div>

            {destinationDirectionsUrl && (
              <motion.a
                href={destinationDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={
                  shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }
                }
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#075B35] px-3 py-2.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(7,91,53,0.13)] transition-colors duration-300 hover:bg-[#06482B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A21B] focus-visible:ring-offset-2 sm:min-h-11 sm:text-xs lg:w-fit lg:min-w-[220px] lg:justify-self-end"
              >
                <Navigation size={15} />
                Get directions on Google Maps
                <ExternalLink size={12} />
              </motion.a>
            )}
          </motion.div>
        )}
      </motion.section>

      <style jsx global>{`
        .kaduna-destination-marker-wrapper {
          background: transparent;
          border: 0;
        }

        .kaduna-destination-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          background: #075b35;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 8px;
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.23);
          transform: rotate(-45deg);
        }

        .kaduna-destination-marker svg {
          width: 21px;
          height: 21px;
          transform: rotate(45deg);
        }

        .kaduna-destination-popup .leaflet-popup-content-wrapper {
          border-radius: 11px;
          padding: 2px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
        }

        .kaduna-destination-popup .leaflet-popup-content {
          margin: 6px;
          width: auto !important;
          min-width: 0;
        }

        .kaduna-destination-popup .leaflet-popup-tip {
          background: #ffffff;
        }

        .kaduna-map-popup-content {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 205px;
          max-width: 100%;
          min-width: 0;
        }

        .kaduna-map-popup-image {
          width: 58px;
          height: 56px;
          flex: 0 0 58px;
          object-fit: cover;
          border-radius: 7px;
        }

        .kaduna-map-popup-details {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .kaduna-map-popup-details h3 {
          display: -webkit-box;
          margin: 0;
          overflow: hidden;
          color: #174b35;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.35;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .kaduna-map-popup-details p {
          display: -webkit-box;
          margin: 3px 0 0;
          overflow: hidden;
          color: #68776c;
          font-size: 9px;
          line-height: 1.35;
          overflow-wrap: anywhere;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .leaflet-container {
          width: 100%;
          font-family: inherit;
          background: #eaf0e5;
          z-index: 0;
        }

        .leaflet-control-attribution {
          display: none !important;
        }

        @media (max-width: 640px) {
          .kaduna-destination-popup .leaflet-popup-content {
            margin: 5px;
          }

          .kaduna-map-popup-content {
            width: 178px;
            gap: 7px;
          }

          .kaduna-map-popup-image {
            width: 48px;
            height: 48px;
            flex-basis: 48px;
            border-radius: 6px;
          }

          .kaduna-map-popup-details h3 {
            font-size: 10px;
            line-height: 1.3;
          }

          .kaduna-map-popup-details p {
            margin-top: 2px;
            font-size: 8px;
            line-height: 1.35;
          }

          .kaduna-destination-marker {
            width: 38px;
            height: 38px;
          }

          .kaduna-destination-marker svg {
            width: 19px;
            height: 19px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .kaduna-destination-marker,
          .kaduna-map-popup-content,
          .leaflet-container {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </>
  );
}

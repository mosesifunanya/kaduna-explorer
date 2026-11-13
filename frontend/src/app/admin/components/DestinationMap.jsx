"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const GOOGLE_SCRIPT_ID = "kaduna-explorer-google-maps-script";
const DEFAULT_ZOOM = 8;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

const GOOGLE_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#F4F0E6" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#655F53" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8F5ED" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#D8CDBA" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#F4F0E6" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry.fill",
    stylers: [{ color: "#E7E9D8" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#E6E5D6" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#DDE6D1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#66715B" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E1D6C7" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#EBC6AD" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ color: "#D9A48C" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#E6B49A" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#D79B80" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: "#FFFDF8" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#E4D7C5" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#D7E5E7" }],
  },
];

function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createDestinationIcon(imageUrl) {
  const safeImageUrl = escapeHtml(imageUrl);

  const html = safeImageUrl
    ? `<div class="ke-map-marker"><img src="${safeImageUrl}" alt="" /></div>`
    : '<div class="ke-map-marker ke-map-marker-empty">📍</div>';

  return L.divIcon({
    className: "ke-map-marker-wrapper",
    html,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });
}

function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps requires a browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(
      new Error("Google Maps API key is missing. Check frontend/.env.local."),
    );
  }

  if (window.__kadunaGoogleMapsPromise) {
    return window.__kadunaGoogleMapsPromise;
  }

  window.__kadunaGoogleMapsPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(GOOGLE_SCRIPT_ID);
    let timeoutId;

    const cleanup = () => window.clearTimeout(timeoutId);

    const finish = (error) => {
      cleanup();

      if (error) {
        reject(error);
      } else if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error("Google Maps API did not initialize."));
      }
    };

    if (script?.dataset.loaded === "true" && window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    if (!script) {
      script = document.createElement("script");
      script.id = GOOGLE_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(GOOGLE_MAPS_KEY) +
        "&v=weekly";
    }

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        finish();
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => finish(new Error("Unable to load Google Maps.")),
      { once: true },
    );

    timeoutId = window.setTimeout(
      () => finish(new Error("Google Maps loading timed out.")),
      15000,
    );

    if (!script.isConnected) {
      document.head.appendChild(script);
    }
  }).catch((error) => {
    window.__kadunaGoogleMapsPromise = null;
    throw error;
  });

  return window.__kadunaGoogleMapsPromise;
}

function MapViewport({ latitude, longitude, zoom, onLocationSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!isValidCoordinate(latitude, longitude)) return;
    map.setView([latitude, longitude], zoom, { animate: true });
  }, [map, latitude, longitude, zoom]);

  useMapEvents({
    click(event) {
      onLocationSelect?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapNavigationControls() {
  const map = useMap();

  const moveMap = (direction) => {
    const distance = Math.max(
      60,
      Math.min(110, Math.round(map.getSize().x * 0.15)),
    );

    const movements = {
      up: [0, -distance],
      down: [0, distance],
      left: [-distance, 0],
      right: [distance, 0],
    };

    map.panBy(movements[direction], {
      animate: true,
      duration: 0.25,
    });
  };

  const buttonStyle =
    "flex h-8 w-8 items-center justify-center rounded-full border border-[#E1E7DD] bg-white text-base font-bold text-[#294638] shadow-md transition hover:bg-[#F0F6ED] active:scale-95 sm:h-10 sm:w-10 sm:text-lg";

  return (
    <div
      className="absolute right-2 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-1.5 sm:right-3 sm:gap-2"
      aria-label="Map navigation controls"
    >
      <button
        type="button"
        className={buttonStyle}
        onClick={() => moveMap("up")}
        aria-label="Move map up"
        title="Move map up"
      >
        ↑
      </button>

      <button
        type="button"
        className={buttonStyle}
        onClick={() => moveMap("left")}
        aria-label="Move map left"
        title="Move map left"
      >
        ←
      </button>

      <button
        type="button"
        className={buttonStyle}
        onClick={() => moveMap("right")}
        aria-label="Move map right"
        title="Move map right"
      >
        →
      </button>

      <button
        type="button"
        className={buttonStyle}
        onClick={() => moveMap("down")}
        aria-label="Move map down"
        title="Move map down"
      >
        ↓
      </button>
    </div>
  );
}

function OpenStreetMap({
  latitude,
  longitude,
  zoom,
  height,
  name,
  address,
  category,
  imageUrl,
  onLocationSelect,
}) {
  const icon = useMemo(() => createDestinationIcon(imageUrl), [imageUrl]);

  const handleDragEnd = useCallback(
    (event) => {
      const position = event.target.getLatLng();

      onLocationSelect?.({
        latitude: position.lat,
        longitude: position.lng,
      });
    },
    [onLocationSelect],
  );

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      style={{ height, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={MAX_ZOOM}
      />

      <ZoomControl position="topleft" />

      <MapNavigationControls />

      <MapViewport
        latitude={latitude}
        longitude={longitude}
        zoom={zoom}
        onLocationSelect={onLocationSelect}
      />

      <Marker
        position={[latitude, longitude]}
        icon={icon}
        draggable
        eventHandlers={{ dragend: handleDragEnd }}
      >
        <Popup>
          <div className="ke-map-popup">
            {imageUrl && (
              <img src={imageUrl} alt={name} className="ke-map-popup-image" />
            )}

            <div className="ke-map-popup-content">
              <p className="ke-map-popup-category">{category}</p>
              <h3>{name}</h3>
              {address && <p>{address}</p>}
              <p className="ke-map-popup-coordinates">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default function DestinationMap({
  latitude,
  longitude,
  name = "Selected destination",
  address = "",
  category = "Destination",
  imageUrl = "",
  height = 460,
  zoom = DEFAULT_ZOOM,
  onLocationSelect,
}) {
  const googleContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const googleInfoWindowRef = useRef(null);
  const googleListenersRef = useRef([]);
  const tileTimeoutRef = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  const [provider, setProvider] = useState("google");
  const [googleReady, setGoogleReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [selectedPosition, setSelectedPosition] = useState(null);

  const lat = latitude === "" || latitude == null ? NaN : Number(latitude);
  const lng = longitude === "" || longitude == null ? NaN : Number(longitude);
  const valid = isValidCoordinate(lat, lng);

  const selectedLat = selectedPosition?.latitude ?? lat;
  const selectedLng = selectedPosition?.longitude ?? lng;
  const selectedValid = isValidCoordinate(selectedLat, selectedLng);

  const effectiveZoom = Number.isFinite(Number(zoom))
    ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(zoom)))
    : DEFAULT_ZOOM;

  const mapHeight = typeof height === "number" ? `${height}px` : height;

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const reportLocation = useCallback((newLat, newLng) => {
    if (!isValidCoordinate(newLat, newLng)) return;

    setSelectedPosition({
      latitude: newLat,
      longitude: newLng,
    });

    onLocationSelectRef.current?.({
      latitude: newLat,
      longitude: newLng,
    });
  }, []);

  useEffect(() => {
    if (!valid) {
      setSelectedPosition(null);
      return;
    }

    setSelectedPosition({
      latitude: lat,
      longitude: lng,
    });
  }, [latitude, longitude, valid, lat, lng]);

  const clearGoogleMap = useCallback(() => {
    if (typeof window !== "undefined") {
      window.clearTimeout(tileTimeoutRef.current);
    }

    googleListenersRef.current.forEach((listener) => listener.remove());
    googleListenersRef.current = [];

    googleInfoWindowRef.current?.close();

    googleMapRef.current = null;
    googleMarkerRef.current = null;
    googleInfoWindowRef.current = null;
  }, []);

  useEffect(() => {
    if (!valid || provider !== "google") return;

    let cancelled = false;
    let tilesLoaded = false;

    const fallback = (message) => {
      if (cancelled) return;

      clearGoogleMap();
      setGoogleReady(false);
      setMapError(message);
      setProvider("osm");
    };

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !googleContainerRef.current) return;

        const map = new maps.Map(googleContainerRef.current, {
          center: { lat, lng },
          zoom: effectiveZoom,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          styles: GOOGLE_MAP_STYLES,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.ControlPosition.LEFT_CENTER,
          },
          clickableIcons: true,
          gestureHandling: "greedy",
          backgroundColor: "#F4F0E6",
        });

        const marker = new maps.Marker({
          map,
          position: { lat, lng },
          draggable: true,
          title: name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: "#F26A35",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 4,
          },
        });

        const infoWindow = new maps.InfoWindow();

        googleMapRef.current = map;
        googleMarkerRef.current = marker;
        googleInfoWindowRef.current = infoWindow;

        const updateInfoWindow = () => {
          const position = marker.getPosition();
          if (!position) return;

          const currentLat = position.lat();
          const currentLng = position.lng();

          infoWindow.setContent(`
            <div style="font-family:Arial,sans-serif;min-width:180px;max-width:240px;padding:5px;color:#24352C">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#F26A35;margin-bottom:6px">
                ${escapeHtml(category)}
              </div>
              <strong style="font-size:15px">${escapeHtml(name)}</strong>
              ${
                address
                  ? `<p style="font-size:12px;margin:6px 0;color:#68736B">${escapeHtml(address)}</p>`
                  : ""
              }
              <p style="font-size:11px;margin:6px 0;color:#68736B">
                ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}
              </p>
            </div>
          `);

          infoWindow.open({
            map,
            anchor: marker,
          });
        };

        googleListenersRef.current.push(
          map.addListener("click", (event) => {
            if (!event.latLng) return;

            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();

            marker.setPosition({ lat: newLat, lng: newLng });
            reportLocation(newLat, newLng);
          }),

          marker.addListener("dragend", () => {
            const position = marker.getPosition();
            if (!position) return;

            reportLocation(position.lat(), position.lng());
          }),

          marker.addListener("click", updateInfoWindow),

          map.addListener("tilesloaded", () => {
            tilesLoaded = true;
            window.clearTimeout(tileTimeoutRef.current);

            if (!cancelled) {
              setGoogleReady(true);
              setMapError("");
            }
          }),
        );

        tileTimeoutRef.current = window.setTimeout(() => {
          if (!tilesLoaded) {
            fallback(
              "Google Maps did not finish loading. OpenStreetMap is being used instead.",
            );
          }
        }, 12000);
      })
      .catch(() => {
        fallback(
          "Google Maps could not load. OpenStreetMap is being used instead.",
        );
      });

    return () => {
      cancelled = true;
      clearGoogleMap();
    };
  }, [
    valid,
    provider,
    lat,
    lng,
    effectiveZoom,
    name,
    address,
    category,
    clearGoogleMap,
    reportLocation,
  ]);

  useEffect(() => {
    if (provider !== "google" || !googleMapRef.current || !valid) return;

    googleMapRef.current.panTo({ lat, lng });
    googleMapRef.current.setZoom(effectiveZoom);
    googleMarkerRef.current?.setPosition({ lat, lng });
  }, [provider, lat, lng, effectiveZoom, valid]);

  useEffect(() => {
    const styleId = "kaduna-explorer-map-controls-responsive";

    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;

    style.textContent = `
      .ke-destination-map {
        position: relative;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }

      /* OpenStreetMap zoom control: left middle */
      .ke-destination-map .leaflet-top.leaflet-left {
        top: 50% !important;
        left: 10px !important;
        transform: translateY(-50%);
      }

      .ke-destination-map .leaflet-control-zoom {
        margin: 0 !important;
        border: none !important;
        border-radius: 12px !important;
        overflow: hidden;
        box-shadow: 0 4px 14px rgba(25, 50, 35, 0.18) !important;
      }

      .ke-destination-map .leaflet-control-zoom a {
        display: flex !important;
        align-items: center;
        justify-content: center;
        width: 38px !important;
        height: 38px !important;
        line-height: 38px !important;
        color: #294638 !important;
        background: #fff !important;
        border: 1px solid #e1e7dd !important;
      }

      .ke-destination-map .leaflet-control-zoom a:hover {
        background: #f0f6ed !important;
      }

      .ke-destination-map .leaflet-control-attribution {
        font-size: 9px !important;
        max-width: 65%;
      }

      /* Keep Google Maps controls positioned consistently */
      .ke-destination-map .gm-bundled-control,
      .ke-destination-map .gmnoprint[role="menubar"] {
        z-index: 900 !important;
      }

      @media (max-width: 1024px) {
        .ke-destination-map {
          height: min(400px, 58vh) !important;
        }
      }

      @media (max-width: 640px) {
        .ke-destination-map {
          height: min(330px, 52vh) !important;
          min-height: 250px;
          border-radius: 12px;
        }

        .ke-destination-map .leaflet-top.leaflet-left {
          top: 50% !important;
          left: 6px !important;
          transform: translateY(-50%);
        }

        .ke-destination-map .leaflet-control-zoom a {
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
        }

        .ke-destination-map .leaflet-control-attribution {
          font-size: 8px !important;
          max-width: 58%;
        }

        .ke-destination-map .leaflet-control-zoom {
          border-radius: 9px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }, []);

  const fullMapUrl = selectedValid
    ? `https://www.openstreetmap.org/?mlat=${selectedLat}&mlon=${selectedLng}#map=${effectiveZoom}/${selectedLat}/${selectedLng}`
    : "https://www.openstreetmap.org/";

  if (!valid) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-[#E1E7DD] bg-[#F8FAF6] px-5 text-center"
        style={{ height: mapHeight }}
      >
        <span className="text-3xl">📍</span>

        <p className="mt-3 text-sm font-bold text-[#294638]">
          Location not selected
        </p>

        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
          Search for a destination or enter valid coordinates to display its
          location on the map.
        </p>
      </div>
    );
  }

  return (
    <div
      className="ke-destination-map relative isolate overflow-hidden rounded-xl border border-[#E1E7DD]"
      style={{ height: mapHeight, width: "100%" }}
    >
      {provider === "google" && (
        <div
          ref={googleContainerRef}
          style={{
            height: "100%",
            width: "100%",
            background: "#F4F0E6",
          }}
          aria-label="Google map showing the selected destination"
        />
      )}

      {provider === "osm" && (
        <OpenStreetMap
          latitude={selectedValid ? selectedLat : lat}
          longitude={selectedValid ? selectedLng : lng}
          zoom={effectiveZoom}
          height="100%"
          name={name}
          address={address}
          category={category}
          imageUrl={imageUrl}
          onLocationSelect={reportLocation}
        />
      )}

      {provider === "google" && !googleReady && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-[#F4F0E6]/95 px-5 text-center">
          <span className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#D5E3D6] border-t-[#176B48]" />

          <p className="text-sm font-bold text-[#294638]">Loading map</p>

          <p className="mt-1 text-xs text-slate-500">
            Preparing your destination map…
          </p>

          {mapError && (
            <p className="mt-2 text-xs text-amber-700">{mapError}</p>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-[600] max-w-[58%] rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:max-w-[68%]">
        <p className="truncate text-xs font-extrabold text-[#103C2A]">{name}</p>

        <p className="mt-0.5 text-[10px] text-slate-500">
          {provider === "google" ? "Google Maps" : "OpenStreetMap"}
        </p>
      </div>

      <div className="absolute right-2 top-2 z-[1100] sm:right-3 sm:top-3">
        <button
          type="button"
          onClick={() => {
            clearGoogleMap();
            setMapError("");
            setGoogleReady(false);
            setProvider((current) => (current === "google" ? "osm" : "google"));
          }}
          className="whitespace-nowrap rounded-xl border border-[#E5E1D8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#176B48] shadow-lg transition hover:bg-[#F0F6ED] sm:px-3 sm:py-2 sm:text-xs"
        >
          {provider === "google" ? "Use OpenStreetMap" : "Use Google Maps"}
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[600] max-w-[55%] rounded-xl border border-white/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:max-w-none">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#176B48] sm:text-[10px]">
          Selected coordinates
        </p>

        <p className="mt-1 break-all text-[10px] font-semibold text-[#294638] sm:text-xs">
          {(selectedValid ? selectedLat : lat).toFixed(6)},{" "}
          {(selectedValid ? selectedLng : lng).toFixed(6)}
        </p>
      </div>

      <a
        href={fullMapUrl}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 z-[1100] rounded-xl border border-[#E5E1D8] bg-white px-3 py-2 text-[10px] font-bold text-[#176B48] shadow-lg transition hover:bg-[#F0F6ED] sm:bottom-[60px] sm:text-xs"
      >
        Open full map ↗
      </a>

      {provider === "osm" && mapError && (
        <div className="absolute bottom-[58px] left-3 z-[1100] max-w-[48%] rounded-lg bg-white/95 px-3 py-2 text-[10px] text-slate-600 shadow-md sm:text-xs">
          {mapError}
        </div>
      )}
    </div>
  );
}

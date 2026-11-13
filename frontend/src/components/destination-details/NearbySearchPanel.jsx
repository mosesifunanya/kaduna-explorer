"use client";

import { Compass, MapPin, RefreshCw, Search } from "lucide-react";

import NearbyPlaceCard from "@/components/destination-details/NearbyPlaceCard";

import { NEARBY_CATEGORIES } from "@/lib/destinationDetailsPageUtils";

export default function NearbySearchPanel({
  destination,
  nearbyQuery,
  setNearbyQuery,
  nearbyPlaces,
  setNearbyPlaces,
  nearbyLoading,
  nearbyError,
  setNearbyError,
  nearbySearched,
  setNearbySearched,
  searchRadiusKm,
  handleSearchRadiusChange,
  gpsEnabled,
  gpsPlaces,
  setGpsPlaces,
  gpsPlacesLoading,
  gpsPlacesError,
  setGpsPlacesError,
  gpsPlacesSearched,
  setGpsPlacesSearched,
  visitorLocation,
  locationLoading,
  locationError,
  cancelNearbySearch,
  searchNearbyPlaces,
  disableVisitorLocation,
  requestVisitorLocation,

  nearbyHasMore = false,
  nearbyLoadingMore = false,
  showMoreNearbyPlaces,

  gpsHasMore = false,
  gpsLoadingMore = false,
  showMoreGpsPlaces,
}) {
  const isSearching = nearbyLoading || gpsPlacesLoading || locationLoading;

  const gpsIsActive = Boolean(gpsEnabled && visitorLocation);

  const handleQueryChange = (value) => {
    cancelNearbySearch();

    setNearbyQuery(value);

    setNearbyPlaces([]);
    setGpsPlaces([]);

    setNearbyError("");
    setGpsPlacesError("");

    setNearbySearched(false);
    setGpsPlacesSearched(false);
  };

  const renderPlaces = (places) => (
    <>
      {places.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-4 md:grid-cols-4">
          {places.map((place, index) => (
            <NearbyPlaceCard
              key={
                place.id ||
                place.placeId ||
                place.osmId ||
                `${place.name}-${place.latitude}-${place.longitude}-${index}`
              }
              place={place}
            />
          ))}
        </div>
      )}
    </>
  );

  const renderShowMore = ({
    hasMore,
    loading,
    onClick,
    label = "Show more",
  }) => {
    if (!hasMore && !loading) return null;

    return (
      <div className="mt-5 flex justify-center sm:mt-6">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="inline-flex min-h-11 min-w-[170px] items-center justify-center gap-2 rounded-xl border border-[#174B35] bg-white px-6 py-3 text-xs font-bold text-[#174B35] transition-all duration-200 hover:bg-[#174B35] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:min-h-12 sm:rounded-2xl sm:text-sm"
        >
          {loading ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              Loading places...
            </>
          ) : (
            label
          )}
        </button>
      </div>
    );
  };

  return (
    <section>
      {/* Section heading */}
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9F2E8] text-[#24714C] sm:h-12 sm:w-12 sm:rounded-2xl">
          <Compass size={21} className="sm:h-6 sm:w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#24714C] sm:text-xs sm:tracking-[0.17em]">
            Discover more
          </p>

          <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#192A35] sm:text-2xl md:text-3xl">
            Places near {destination.name}
          </h2>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-[#707B82] sm:mt-3 sm:text-sm sm:leading-6 md:text-base">
            Discover places around this destination, even when you are somewhere
            else. Turn on GPS to search around your current location.
          </p>
        </div>
      </div>

      {/* Search panel */}
      <div className="mt-5 rounded-2xl border border-[#EAE7DF] bg-[#F5F3ED] p-3 sm:mt-6 sm:rounded-3xl sm:p-4">
        <form
          onSubmit={searchNearbyPlaces}
          className="flex flex-col gap-2.5 sm:flex-row sm:gap-3"
        >
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#E4E3DD] bg-white px-3 transition focus-within:border-[#24714C] focus-within:ring-2 focus-within:ring-[#24714C]/10 sm:min-h-14 sm:gap-3 sm:rounded-2xl sm:px-4">
            <Search
              size={18}
              className="shrink-0 text-[#818B91] sm:h-5 sm:w-5"
            />

            <input
              type="search"
              value={nearbyQuery}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Restaurants, hospitals, markets..."
              aria-label="Search for nearby places"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-[#192A35] outline-none placeholder:text-[#929BA2] sm:py-3 sm:text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FFC15A] px-4 py-2.5 text-xs font-bold text-[#192A35] transition hover:bg-[#F0AD35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A96816] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:min-h-14 sm:w-auto sm:min-w-[155px] sm:rounded-2xl sm:px-5 sm:text-sm"
          >
            {nearbyLoading || gpsPlacesLoading ? (
              <RefreshCw size={15} className="animate-spin sm:h-4 sm:w-4" />
            ) : (
              <Search size={16} className="sm:h-[18px] sm:w-[18px]" />
            )}

            {gpsIsActive ? "Use my location" : "Search nearby"}
          </button>
        </form>

        {/* Search categories */}
        <div
          className="mt-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-1 sm:gap-2"
          aria-label="Nearby search categories"
        >
          {NEARBY_CATEGORIES.map((category) => {
            const active = nearbyQuery.toLowerCase() === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => handleQueryChange(category)}
                aria-pressed={active}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold capitalize transition sm:px-3.5 sm:py-2 sm:text-xs ${
                  active
                    ? "border-[#174B35] bg-[#174B35] text-white"
                    : "border-[#E4E3DD] bg-white text-[#43515A] hover:border-[#C5BBA9] hover:bg-[#F4F1E9]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Search radius */}
        <div className="mt-3 rounded-xl border border-[#E4E3DD] bg-white p-3 sm:rounded-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#192A35] sm:text-sm">
              Search radius
            </p>

            <span className="text-[10px] text-[#818B91] sm:text-xs">
              Expand your search area
            </span>
          </div>

          <div
            className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2"
            role="group"
            aria-label="Nearby search radius"
          >
            {[1, 3, 5, 10, 25].map((radiusKm) => (
              <button
                key={radiusKm}
                type="button"
                onClick={() => handleSearchRadiusChange(radiusKm)}
                aria-pressed={searchRadiusKm === radiusKm}
                className={`min-h-8 rounded-full border px-3 py-1.5 text-[10px] font-bold transition sm:min-h-10 sm:px-4 sm:py-2 sm:text-xs ${
                  searchRadiusKm === radiusKm
                    ? "border-[#24714C] bg-[#24714C] text-white"
                    : "border-[#E4E3DD] bg-white text-[#43515A] hover:border-[#AFCBB4] hover:bg-[#F0F5EF]"
                }`}
              >
                {radiusKm} km
              </button>
            ))}
          </div>
        </div>

        {/* GPS controls */}
        <div className="mt-3 rounded-xl border border-[#E4E3DD] bg-white p-3 sm:rounded-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
              <MapPin
                size={19}
                className="mt-0.5 shrink-0 text-[#24714C] sm:h-[22px] sm:w-[22px]"
              />

              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#192A35] sm:text-sm">
                  Use my location
                </h3>

                <p className="mt-1 text-[10px] leading-4 text-[#707B82] sm:text-xs sm:leading-5">
                  {gpsIsActive
                    ? "Search results will be based on your current location."
                    : "Search around this destination or turn on GPS to use your current location."}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={gpsIsActive}
              aria-label="Use my current location for nearby search"
              onClick={() => {
                if (gpsIsActive) {
                  disableVisitorLocation();
                } else if (!locationLoading) {
                  requestVisitorLocation();
                }
              }}
              disabled={locationLoading}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D9E3D9] bg-[#F0F5EF] px-2.5 py-2 transition hover:border-[#AFCBB4] disabled:cursor-wait disabled:opacity-60 sm:min-h-11 sm:gap-3 sm:rounded-xl sm:px-3"
            >
              <span className="text-[10px] font-bold text-[#24714C] sm:text-xs">
                {locationLoading
                  ? "Finding..."
                  : gpsIsActive
                    ? "GPS ON"
                    : "GPS OFF"}
              </span>

              <span
                aria-hidden="true"
                className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors sm:h-7 sm:w-12 sm:p-1 ${
                  gpsIsActive ? "bg-[#267748]" : "bg-[#C9CECA]"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    gpsIsActive
                      ? "translate-x-4 sm:translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </span>

              {locationLoading && (
                <RefreshCw size={13} className="animate-spin text-[#24714C]" />
              )}
            </button>
          </div>

          {locationError && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-[#FFF4E5] px-3 py-2.5 text-[11px] leading-5 text-[#8A5200] sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
            >
              {locationError}
            </p>
          )}

          {gpsIsActive && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-[#E9F2E8] px-3 py-2.5 text-[11px] leading-5 text-[#28623D] sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
            >
              GPS is enabled. Searches will use your current location. Turn GPS
              off to return to {destination.name}.
            </p>
          )}
        </div>
      </div>

      {/* Destination search error */}
      {nearbyError && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#E8C7BD] bg-[#FFF5F1] p-3 text-xs leading-5 text-[#923D2B] sm:mt-5 sm:rounded-2xl sm:p-4 sm:text-sm sm:leading-6"
        >
          {nearbyError}
        </div>
      )}

      {/* Destination search results */}
      {nearbySearched && !nearbyLoading && !gpsEnabled && (
        <div className="mt-5 sm:mt-6">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-extrabold text-[#192A35] sm:text-xl">
                {nearbyPlaces.length > 0
                  ? "Nearby places"
                  : "No matching places found"}
              </h3>

              <p className="mt-1 text-[10px] leading-4 text-[#707B82] sm:text-sm sm:leading-6">
                {nearbyPlaces.length > 0
                  ? `${nearbyPlaces.length} unique places found within ${searchRadiusKm} km of ${destination.name}.`
                  : "Try another category or search term. Not every business is listed in the external place database."}
              </p>
            </div>

            {nearbyPlaces.length > 0 && (
              <span className="shrink-0 rounded-full bg-[#E9F2E8] px-2.5 py-1 text-[9px] font-bold text-[#28623D] sm:px-3 sm:py-1.5 sm:text-xs">
                Nearest first
              </span>
            )}
          </div>

          {renderPlaces(nearbyPlaces)}

          {renderShowMore({
            hasMore: nearbyHasMore,
            loading: nearbyLoadingMore,
            onClick: showMoreNearbyPlaces,
          })}
        </div>
      )}

      {/* Destination search loading */}
      {nearbyLoading && !gpsEnabled && (
        <div
          role="status"
          className="mt-5 flex items-center justify-center gap-2.5 rounded-xl border border-[#EAE7DF] bg-white p-5 text-xs font-semibold text-[#43515A] sm:mt-6 sm:rounded-2xl sm:gap-3 sm:p-8 sm:text-sm"
        >
          <RefreshCw
            size={16}
            className="animate-spin text-[#24714C] sm:h-[18px] sm:w-[18px]"
          />
          Searching around {destination.name}...
        </div>
      )}

      {/* GPS search loading */}
      {gpsPlacesLoading && gpsEnabled && (
        <div
          role="status"
          className="mt-5 flex items-center justify-center gap-2.5 rounded-xl border border-[#D9E8D8] bg-white p-5 text-xs font-semibold text-[#43515A] sm:mt-6 sm:rounded-2xl sm:gap-3 sm:p-6 sm:text-sm"
        >
          <RefreshCw
            size={16}
            className="animate-spin text-[#24714C] sm:h-[18px] sm:w-[18px]"
          />
          Searching around your current location...
        </div>
      )}

      {/* GPS search error */}
      {gpsPlacesError && gpsEnabled && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#E8C7BD] bg-[#FFF5F1] p-3 text-xs leading-5 text-[#923D2B] sm:mt-5 sm:rounded-2xl sm:p-4 sm:text-sm sm:leading-6"
        >
          {gpsPlacesError}
        </div>
      )}

      {/* GPS results */}
      {gpsEnabled &&
        gpsPlacesSearched &&
        !gpsPlacesLoading &&
        !gpsPlacesError && (
          <div className="mt-6 rounded-2xl border border-[#D9E8D8] bg-[#F7FBF6] p-3 sm:mt-8 sm:rounded-3xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-[#192A35] sm:text-xl">
                  Places near your current location
                </h3>

                <p className="mt-1 text-[10px] leading-4 text-[#707B82] sm:text-sm sm:leading-6">
                  {gpsPlaces.length > 0
                    ? `${gpsPlaces.length} unique places found within ${searchRadiusKm} km of your GPS location.`
                    : "No matching places found near your current location. Try another search category."}
                </p>
              </div>

              {gpsPlaces.length > 0 && (
                <span className="shrink-0 rounded-full bg-[#E9F2E8] px-2.5 py-1 text-[9px] font-bold text-[#28623D] sm:px-3 sm:py-1.5 sm:text-xs">
                  Nearest first
                </span>
              )}
            </div>

            {renderPlaces(gpsPlaces)}

            {renderShowMore({
              hasMore: gpsHasMore,
              loading: gpsLoadingMore,
              onClick: showMoreGpsPlaces,
            })}
          </div>
        )}
    </section>
  );
}

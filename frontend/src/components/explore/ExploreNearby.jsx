"use client";

import { LocateFixed, RefreshCw, Search, MapPin } from "lucide-react";

import ExternalPlaceCard from "@/components/ExternalPlaceCard";

const ITEMS_PER_PAGE = 8;

function Pagination({ page, totalItems, onPageChange, label }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) return null;

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, totalItems);

  return (
    <nav
      aria-label={`Pagination for ${label}`}
      className="mt-5 flex flex-col gap-3 rounded-xl border border-[#E7E4DC] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <p className="text-[11px] text-[#707B82] sm:text-xs" aria-live="polite">
        Showing {startItem}–{endItem} of {totalItems} {label}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#E4E3DD] px-3 py-2 text-[11px] font-bold text-[#43515A] transition hover:bg-[#F4F1E9] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
        >
          Previous
        </button>

        <span className="whitespace-nowrap text-[11px] font-semibold text-[#43515A] sm:text-xs">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-[#E4E3DD] px-3 py-2 text-[11px] font-bold text-[#43515A] transition hover:bg-[#F4F1E9] disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export default function ExploreNearby({
  nearbyOpen,
  nearbyQuery,
  setNearbyQuery,
  nearbyRadiusKm,
  setNearbyRadiusKm,
  nearbyCategories,
  nearbyRadii,
  nearbyPlaces,
  paginatedNearbyPlaces,
  nearbyLoading,
  nearbyError,
  nearbySearched,
  nearbyPage,
  setNearbyPage,
  handleNearbySubmit,
  handleNearbyCategory,
  visitorLocation,
  locationLoading,
  locationError,
  refreshNearbyLocation,
}) {
  if (!nearbyOpen) return null;

  return (
    <section
      id="nearby-search-panel"
      className="scroll-mt-4 px-3 pb-4 sm:px-6 lg:px-8"
      aria-labelledby="nearby-heading"
    >
      {/* Entire Nearby container */}
      <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[24px] border border-[#E9E5DC] bg-white shadow-[0_12px_35px_rgba(25,42,53,0.06)] sm:rounded-[30px] lg:rounded-[36px]">
        {/* Nearby Discovery Banner */}
        <div
          className="
            relative isolate
            min-h-[150px] overflow-hidden
            bg-[#EAF4E9]
            px-5 pb-5 pt-5
            sm:min-h-[170px] sm:px-8 sm:pb-6 sm:pt-6
            lg:min-h-[220px] lg:px-12 lg:pb-6 lg:pt-7
          "
        >
          {/* Original background image */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute inset-0 z-0
              bg-no-repeat
              bg-cover
              bg-center
              lg:bg-[position:center_65%]
            "
            style={{
              backgroundImage: "url('/assets/images/nearby-discovery-bg.png')",
            }}
          />

          {/* Soft background blend */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute inset-0 z-[1]
              bg-gradient-to-r
              from-[#EAF5EE]/55
              via-[#EAF5EE]/20
              to-transparent
            "
          />

          {/* Banner content */}
          <div className="relative z-10 max-w-[760px]">
            <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#17623F] sm:text-[10px] sm:tracking-[0.22em] lg:text-xs">
              Nearby Discovery
              <span className="h-px w-8 bg-[#A8C9AF]" />
            </p>

            <h2
              id="nearby-heading"
              className="
                mt-2 max-w-[650px]
                font-serif font-bold
                text-[22px] leading-[1.15]
                tracking-[-0.035em]
                text-[#102238]
                sm:mt-3 sm:text-[29px]
                lg:text-[36px]
              "
            >
              Explore places around you
            </h2>

            <p
              className="mt-2 max-w-[520px] text-[15px] font-medium italic leading-tight text-orange sm:mt-3 sm:text-[19px] lg:text-[27px]"
              style={{
                fontFamily: "'Segoe Print', 'Comic Sans MS', cursive",
              }}
            >
              Find amazing places near your current location.
            </p>
          </div>
        </div>

        {/* Search controls */}
        <div
          className="
            relative z-10 -mt-1
            rounded-t-[24px]
            border-t border-[#F0EEE9]
            bg-white
            px-4 pb-3 pt-3
            sm:rounded-t-[30px]
            sm:px-7 sm:pb-4 sm:pt-4
            lg:px-10 lg:pb-4 lg:pt-4
          "
        >
          <form
            onSubmit={handleNearbySubmit}
            className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_220px_245px]"
          >
            <label className="sr-only" htmlFor="nearby-category">
              Place category
            </label>

            {/* Search input */}
            <div className="col-span-2 flex min-h-[50px] min-w-0 items-center gap-3 rounded-[17px] border border-[#E8E6E1] bg-[#FAF9F7] px-4 transition focus-within:border-[#17623F] focus-within:ring-2 focus-within:ring-[#17623F]/10 sm:min-h-[58px] sm:px-5 lg:col-span-1 lg:min-h-[62px] lg:rounded-[20px]">
              <Search
                size={20}
                className="shrink-0 text-[#7B8791]"
                aria-hidden="true"
              />

              <input
                id="nearby-category"
                value={nearbyQuery}
                onChange={(event) => setNearbyQuery(event.target.value)}
                placeholder="e.g. restaurants, hotels, attractions..."
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[#102238] outline-none placeholder:text-[#89939B] sm:text-base"
              />
            </div>

            {/* Radius selector */}
            <label className="sr-only" htmlFor="nearby-radius">
              Search radius
            </label>

            <div className="relative col-span-1">
              <LocateFixed
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#102238] sm:left-4 sm:h-5 sm:w-5"
                aria-hidden="true"
              />

              <select
                id="nearby-radius"
                value={nearbyRadiusKm}
                onChange={(event) => setNearbyRadiusKm(event.target.value)}
                className="min-h-[50px] w-full appearance-none rounded-[15px] border border-[#E8E6E1] bg-white pl-10 pr-8 text-[11px] font-semibold text-[#102238] outline-none transition focus:border-[#17623F] sm:min-h-[58px] sm:rounded-[18px] sm:pl-12 sm:pr-10 sm:text-sm lg:min-h-[62px] lg:rounded-[20px]"
              >
                {nearbyRadii.map((radius) => (
                  <option key={radius.value} value={radius.value}>
                    {radius.label}
                  </option>
                ))}
              </select>

              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#102238] sm:right-4"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Search button */}
            <button
              type="submit"
              disabled={nearbyLoading || locationLoading}
              className="col-span-1 inline-flex min-h-[50px] w-full items-center justify-center gap-1.5 rounded-[15px] bg-[#FFB900] px-2.5 text-[11px] font-extrabold text-[#102238] shadow-[0_4px_12px_rgba(255,185,0,0.13)] transition duration-200 hover:bg-[#FFCA35] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:min-h-[58px] sm:rounded-[18px] sm:px-4 sm:text-sm lg:min-h-[62px] lg:rounded-[20px]"
            >
              {nearbyLoading || locationLoading ? (
                <RefreshCw size={16} className="shrink-0 animate-spin" />
              ) : (
                <Search size={16} className="shrink-0" />
              )}

              <span className="whitespace-nowrap">
                {nearbyLoading || locationLoading
                  ? "Searching..."
                  : "Search nearby"}
              </span>
            </button>
          </form>

          {/* Category shortcuts */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-4 sm:flex-wrap sm:gap-2.5 lg:mt-5">
            {nearbyCategories.map((item) => {
              const isSelected = nearbyQuery.toLowerCase() === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleNearbyCategory(item)}
                  disabled={nearbyLoading}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border px-3.5 py-2 text-[10px] font-semibold capitalize transition duration-200 sm:min-h-[40px] sm:px-5 sm:text-sm ${
                    isSelected
                      ? "border-[#17623F] bg-[#17623F] text-white shadow-sm"
                      : "border-[#E9E6E0] bg-[#FAF9F7] text-[#102238] hover:border-[#17623F]/40 hover:bg-[#EFF6EF] hover:text-[#17623F]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Location status */}
          <div
            className="
              mt-3 flex flex-col gap-2
              rounded-[16px]
              bg-[#F1F6F0]
              p-3
              sm:mt-4 sm:flex-row sm:items-center
              sm:justify-between sm:px-4 sm:py-3
              lg:mt-4 lg:rounded-[18px]
            "
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3F0E3] text-[#17623F] sm:h-[48px] sm:w-[48px]">
                <LocateFixed size={22} strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#102238] sm:text-base">
                  {locationLoading
                    ? "Finding your location..."
                    : visitorLocation
                      ? "Location ready"
                      : "Location access needed"}
                </p>

                <p className="mt-1 break-words text-[11px] leading-5 text-[#77828B] sm:text-sm">
                  {visitorLocation
                    ? `Lat ${visitorLocation.lat.toFixed(5)}, Lng ${visitorLocation.lon.toFixed(5)}`
                    : "Allow location access to discover places around you."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshNearbyLocation}
              disabled={locationLoading}
              className="inline-flex min-h-[40px] w-full shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[#D4E4D6] bg-white px-4 py-2 text-[12px] font-bold text-[#17623F] transition hover:bg-[#E8F3E8] disabled:cursor-wait disabled:opacity-50 sm:min-h-[42px] sm:w-auto sm:px-5 sm:text-sm"
            >
              <RefreshCw
                size={16}
                className={locationLoading ? "animate-spin" : ""}
              />
              Update location
            </button>
          </div>

          {/* Error messages */}
          {(locationError || nearbyError) && (
            <div
              role="status"
              className="mt-3 break-words rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-[#76521B] sm:px-5 sm:text-xs sm:leading-6"
            >
              {locationError || nearbyError}
            </div>
          )}

          {/* Loading state */}
          {nearbyLoading && (
            <div
              className="mt-4 flex items-center gap-3 rounded-xl border border-[#E7E4DC] bg-[#FAF9F6] p-4 text-[13px] text-[#43515A] sm:p-5 sm:text-sm"
              role="status"
            >
              <RefreshCw
                size={17}
                className="shrink-0 animate-spin text-[#17623F]"
              />
              Searching for nearby places...
            </div>
          )}

          {/* Nearby results */}
          {!nearbyLoading && nearbyPlaces.length > 0 && (
            <div className="mt-5 sm:mt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-bold tracking-tight text-[#102238] sm:text-xl">
                  Places near you
                </h3>

                <span className="text-[11px] font-medium text-[#78838D] sm:text-xs">
                  {nearbyPlaces.length} results
                </span>
              </div>

              <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
                {paginatedNearbyPlaces.map((place, index) => (
                  <ExternalPlaceCard
                    key={place.id || `${place.name}-${index}`}
                    place={place}
                  />
                ))}
              </div>

              <Pagination
                page={nearbyPage}
                totalItems={nearbyPlaces.length}
                onPageChange={setNearbyPage}
                label="nearby places"
              />

              <p className="mt-4 text-[11px] leading-5 text-[#78838D] sm:text-xs">
                External place details can be incomplete or out of date. Confirm
                opening hours and availability before travelling.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!nearbyLoading &&
            nearbySearched &&
            nearbyPlaces.length === 0 &&
            !nearbyError &&
            !locationError && (
              <div className="mt-5 rounded-xl border border-dashed border-[#D8D7CF] bg-[#FAF9F6] px-4 py-6 text-center sm:py-8">
                <MapPin size={23} className="mx-auto mb-3 text-[#17623F]" />

                <h3 className="font-serif text-base font-bold text-[#102238] sm:text-lg">
                  No places found nearby
                </h3>

                <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-[#78838D] sm:text-xs sm:leading-6">
                  Try another category or increase the search distance to
                  discover more places.
                </p>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}

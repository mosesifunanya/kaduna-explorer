"use client";

import { Landmark, MapPin, RefreshCw, Search } from "lucide-react";

import DestinationCard from "@/components/DestinationCard";
import ExternalPlaceCard from "@/components/ExternalPlaceCard";

const ITEMS_PER_PAGE = 8;

function destinationHref(destination) {
  const identifier = destination.slug || destination.id || destination._id;

  return identifier
    ? `/explore/${encodeURIComponent(String(identifier))}`
    : "/explore";
}

function destinationKey(destination) {
  return String(
    destination.id || destination.slug || destination._id || destination.name,
  );
}

function Pagination({ page, totalItems, onPageChange, label }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) return null;

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, totalItems);

  return (
    <nav
      aria-label={`Pagination for ${label}`}
      className="mt-6 flex flex-col gap-3 rounded-xl border border-[#E7E4DC] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <p className="text-xs text-[#707B82]" aria-live="polite">
        Showing {startItem}–{endItem} of {totalItems} {label}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#E4E3DD] px-3 py-2 text-xs font-bold text-[#43515A] transition hover:bg-[#F4F1E9] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="whitespace-nowrap text-xs font-semibold text-[#43515A]">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#E4E3DD] px-3 py-2 text-xs font-bold text-[#43515A] transition hover:bg-[#F4F1E9] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export default function ExploreSearchResults({
  submittedQuery,
  resetFilters,

  submittedCmsMatches,
  paginatedOfficialMatches,
  officialPage,
  setOfficialPage,
  showOfficialSearchResults,

  externalPlaces,
  paginatedExternalPlaces,
  externalLoading,
  externalError,
  externalHasMore,
  externalLoadingMore,
  loadMoreExternalPlaces,
  showExternalSearchResults,
}) {
  const hasSearchResults =
    showOfficialSearchResults || showExternalSearchResults;

  if (!submittedQuery && !hasSearchResults) {
    return null;
  }

  return (
    <div className="mt-5">
      {/* Search query banner */}
      {submittedQuery && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE7DE] bg-[#F0F5EF] px-4 py-3">
          <div className="flex min-w-0 items-start gap-2">
            <Search size={17} className="mt-0.5 shrink-0 text-[#24714C]" />

            <p className="break-words text-sm leading-6 text-[#43515A]">
              Search results for{" "}
              <strong className="text-[#192A35]">
                &ldquo;{submittedQuery}&rdquo;
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="shrink-0 text-xs font-bold text-[#24714C] hover:text-[#192A35]"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Official Kaduna Explorer search results */}
      {showOfficialSearchResults && (
        <section className="mt-6" aria-labelledby="official-results-heading">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F0E6] text-[#24714C]">
              <Landmark size={20} />
            </div>

            <div>
              <h3
                id="official-results-heading"
                className="font-extrabold text-[#192A35]"
              >
                Kaduna Explorer destinations
              </h3>

              <p className="mt-1 text-xs text-[#707B82]">
                Official destinations published by our team
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
            {paginatedOfficialMatches.map((destination) => (
              <DestinationCard
                key={destinationKey(destination)}
                destination={destination}
                href={destinationHref(destination)}
              />
            ))}
          </div>

          <Pagination
            page={officialPage}
            totalItems={submittedCmsMatches.length}
            onPageChange={setOfficialPage}
            label="official destinations"
          />
        </section>
      )}

      {/* External map-provider search results */}
      {(showExternalSearchResults || externalLoading) && (
        <section className="mt-6" aria-labelledby="external-results-heading">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F0E6] text-[#24714C]">
              <MapPin size={20} />
            </div>

            <div>
              <h3
                id="external-results-heading"
                className="font-extrabold text-[#192A35]"
              >
                More places to explore
              </h3>

              <p className="mt-1 text-xs text-[#707B82]">
                Places discovered through external map data
              </p>
            </div>
          </div>

          {externalLoading && (
            <div
              className="flex items-center gap-3 rounded-xl border border-[#E4E3DD] bg-white p-5 text-sm text-[#43515A]"
              role="status"
            >
              <RefreshCw size={18} className="animate-spin text-[#24714C]" />
              Searching for places...
            </div>
          )}

          {externalError && (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-[#76521B]"
            >
              {externalError}
            </p>
          )}

          {!externalLoading && externalPlaces.length > 0 && (
            <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
              {paginatedExternalPlaces.map((place, index) => (
                <ExternalPlaceCard
                  key={place.id || place.placeId || `${place.name}-${index}`}
                  place={place}
                />
              ))}
            </div>
          )}

          {!externalLoading &&
            !externalError &&
            externalPlaces.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#D8D7CF] bg-white p-5 text-sm leading-6 text-[#707B82]">
                Google did not return a matching place. You can still check
                OpenStreetMap for another set of results.
              </div>
            )}

          {externalHasMore && !externalLoading && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={loadMoreExternalPlaces}
                disabled={externalLoadingMore}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C9D9CB] bg-white px-6 py-3 text-sm font-bold text-[#285D3B] shadow-sm transition hover:border-[#8EAE94] hover:bg-[#F4F8F3] disabled:cursor-wait disabled:opacity-60"
              >
                {externalLoadingMore && (
                  <RefreshCw size={15} className="animate-spin" />
                )}

                {externalLoadingMore ? "Loading more places..." : "Show more"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

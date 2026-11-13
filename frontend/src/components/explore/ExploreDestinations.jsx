"use client";

import {
  ArrowRight,
  Compass,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import DestinationCard from "@/components/DestinationCard";
import ExploreSearchResults from "@/components/explore/ExploreSearchResults";

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
      className="mt-6 flex flex-col gap-3 rounded-xl border border-[#E7E4DC] bg-white px-3 py-3 font-[family-name:var(--font-inter)] sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <p className="text-xs text-[#707B82]" aria-live="polite">
        Showing {startItem}–{endItem} of {totalItems} {label}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#E4E3DD] px-3 py-2 text-xs font-semibold text-[#43515A] transition hover:bg-[#F4F1E9] disabled:cursor-not-allowed disabled:opacity-40"
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
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#E4E3DD] px-3 py-2 text-xs font-semibold text-[#43515A] transition hover:bg-[#F4F1E9] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function SkeletonCard() {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[#EAE7DF] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[#EAECE7]" />

      <div className="space-y-3 p-3">
        <div className="h-3 w-2/5 animate-pulse rounded bg-[#EAECE7]" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-[#EAECE7]" />
        <div className="h-3 w-full animate-pulse rounded bg-[#EAECE7]" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-[#EAECE7]" />
      </div>
    </div>
  );
}

export default function ExploreDestinations({
  categories,
  category,
  setCategory,
  categoryCounts,

  submittedQuery,
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

  loading,
  error,
  loadDestinations,

  filteredDestinations,
  paginatedDestinations,
  destinationPage,
  setDestinationPage,

  hasFilters,
  resetFilters,

  showSort,
  setShowSort,
  sortBy,
  setSortBy,
}) {
  return (
    <section
      id="explore-results"
      className="mx-auto w-full max-w-[1600px] scroll-mt-5 px-3 pb-12 font-[family-name:var(--font-inter)] sm:px-6 lg:px-10 2xl:px-12"
      aria-labelledby="explore-destinations-heading"
    >
      {/* Section heading */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#24714C] sm:text-[11px]">
            Explore Kaduna
          </p>

          <h2
            id="explore-destinations-heading"
            className="mt-1.5 font-[family-name:var(--font-playfair)] text-[27px] font-bold leading-[1.13] tracking-[-0.035em] text-[#192A35] sm:text-3xl lg:text-[36px]"
          >
            Places worth discovering
          </h2>

          <p className="mt-2 max-w-2xl text-[13px] leading-[1.7] text-[#707B82] sm:text-sm sm:leading-6">
            From breathtaking landscapes to local flavours, explore the best of
            Kaduna State.
          </p>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasFilters}
          className="hidden shrink-0 items-center gap-2 pb-1 text-sm font-semibold text-[#B56B0B] transition hover:text-[#192A35] disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
        >
          Clear filters
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Search results */}
      <ExploreSearchResults
        submittedQuery={submittedQuery}
        resetFilters={resetFilters}
        submittedCmsMatches={submittedCmsMatches}
        paginatedOfficialMatches={paginatedOfficialMatches}
        officialPage={officialPage}
        setOfficialPage={setOfficialPage}
        showOfficialSearchResults={showOfficialSearchResults}
        externalPlaces={externalPlaces}
        paginatedExternalPlaces={paginatedExternalPlaces}
        externalLoading={externalLoading}
        externalError={externalError}
        externalHasMore={externalHasMore}
        externalLoadingMore={externalLoadingMore}
        loadMoreExternalPlaces={loadMoreExternalPlaces}
        showExternalSearchResults={showExternalSearchResults}
      />

      {/* Normal destination browsing */}
      {!submittedQuery && (
        <>
          {/* Category filters */}
          <div
            className="mt-5 flex gap-2 overflow-x-auto pb-2"
            aria-label="Filter destinations by category"
          >
            {categories.map((item) => {
              const active = category === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={active}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B56B0B] sm:min-h-10 sm:px-4 sm:py-2.5 sm:text-xs ${
                    active
                      ? "border-[#192A35] bg-[#192A35] text-white"
                      : "border-[#E4E3DD] bg-white text-[#43515A] hover:border-[#C5BBA9] hover:bg-[#F4F1E9]"
                  }`}
                >
                  {item === "All" && <SlidersHorizontal size={14} />}
                  {item !== "All" && <Compass size={14} />}

                  {item}

                  <span
                    className={`text-[10px] ${
                      active ? "text-white/65" : "text-[#8B9397]"
                    }`}
                  >
                    {categoryCounts[item] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Destination count and sorting */}
          <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
            <p
              className="text-xs font-medium text-[#707B82] sm:text-sm"
              aria-live="polite"
            >
              {loading
                ? "Finding places for you..."
                : `${filteredDestinations.length} ${
                    filteredDestinations.length === 1
                      ? "destination"
                      : "destinations"
                  } found`}
            </p>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSort((current) => !current)}
                aria-expanded={showSort}
                aria-controls="explore-sort-options"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E4E3DD] bg-white px-3 py-2 text-xs font-semibold text-[#43515A] transition hover:bg-[#F4F1E9]"
              >
                <SlidersHorizontal size={14} />
                Sort by
              </button>

              {showSort && (
                <div
                  id="explore-sort-options"
                  className="absolute right-0 top-full z-20 mt-2 min-w-44 rounded-xl border border-[#E4E3DD] bg-white p-1.5 shadow-xl"
                >
                  {[
                    ["recommended", "Recommended"],
                    ["featured", "Featured first"],
                    ["newest", "Recently added"],
                    ["name", "Name: A to Z"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSortBy(value);
                        setShowSort(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        sortBy === value
                          ? "bg-[#F5EFE2] font-bold text-[#8B590F]"
                          : "text-[#43515A] hover:bg-[#F7F6F1]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div
              className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4"
              role="status"
              aria-label="Loading destinations"
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-white px-5 py-10 text-center"
            >
              <p className="font-semibold text-[#192A35]">
                We couldn&apos;t load destinations.
              </p>

              <p className="mt-2 text-sm text-[#707B82]">{error}</p>

              <button
                type="button"
                onClick={loadDestinations}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#192A35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24714C]"
              >
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredDestinations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#D8D7CF] bg-white px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F2EC] text-[#24714C]">
                <Compass size={23} />
              </div>

              <h3 className="mt-4 font-[family-name:var(--font-playfair)] text-xl font-bold text-[#192A35]">
                No destinations found
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#707B82]">
                Try changing your search or selecting another category.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-lg bg-[#192A35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24714C]"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Destination cards */}
          {!loading && !error && filteredDestinations.length > 0 && (
            <>
              <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
                {paginatedDestinations.map((destination) => (
                  <DestinationCard
                    key={destinationKey(destination)}
                    destination={destination}
                    href={destinationHref(destination)}
                  />
                ))}
              </div>

              <Pagination
                page={destinationPage}
                totalItems={filteredDestinations.length}
                onPageChange={setDestinationPage}
                label="destinations"
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

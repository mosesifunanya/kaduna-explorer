"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import ExploreHero from "@/components/explore/ExploreHero";
import ExploreNearby from "@/components/explore/ExploreNearby";
import ExploreDestinations from "@/components/explore/ExploreDestinations";

import OutsideKadunaModal from "@/components/OutsideKadunaModal";

import { useExplorePage } from "@/hooks/explore/useExplorePage";

export default function ExplorePage() {
  const {
    // Destinations
    categories,
    categoryCounts,
    category,
    setCategory,

    filteredDestinations,
    paginatedDestinations,
    destinationPage,
    setDestinationPage,

    loading,
    error,
    loadDestinations,

    // Search
    search,
    setSearch,
    clearSearch,
    submittedQuery,
    handleSearchSubmit,

    // Sorting and filters
    hasFilters,
    resetFilters,
    sortBy,
    setSortBy,
    showSort,
    setShowSort,

    // Official destination search results
    submittedCmsMatches,
    paginatedOfficialMatches,
    officialPage,
    setOfficialPage,
    showOfficialSearchResults,

    // External place search results
    externalPlaces,
    paginatedExternalPlaces,
    externalLoading,
    externalError,
    externalHasMore,
    externalLoadingMore,
    loadMoreExternalPlaces,
    showExternalSearchResults,

    // Nearby search
    nearbyOpen,
    toggleNearby,
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

    // Visitor location
    visitorLocation,
    locationLoading,
    locationError,
    refreshNearbyLocation,

    // Outside Kaduna modal
    showOutsideKadunaModal,
    closeOutsideKadunaModal,
  } = useExplorePage();

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FAF9F6] text-[#192A35]">
      {/* Main navigation */}
      <Header activeNav="explore" />

      {/* Explore hero and main search */}
      <ExploreHero
        search={search}
        setSearch={setSearch}
        handleSearchSubmit={handleSearchSubmit}
        clearSearch={clearSearch}
        externalLoading={externalLoading}
        nearbyOpen={nearbyOpen}
        toggleNearby={toggleNearby}
      />

      {/* Nearby places panel */}
      <ExploreNearby
        nearbyOpen={nearbyOpen}
        nearbyQuery={nearbyQuery}
        setNearbyQuery={setNearbyQuery}
        nearbyRadiusKm={nearbyRadiusKm}
        setNearbyRadiusKm={setNearbyRadiusKm}
        nearbyCategories={nearbyCategories}
        nearbyRadii={nearbyRadii}
        nearbyPlaces={nearbyPlaces}
        paginatedNearbyPlaces={paginatedNearbyPlaces}
        nearbyLoading={nearbyLoading}
        nearbyError={nearbyError}
        nearbySearched={nearbySearched}
        nearbyPage={nearbyPage}
        setNearbyPage={setNearbyPage}
        handleNearbySubmit={handleNearbySubmit}
        handleNearbyCategory={handleNearbyCategory}
        visitorLocation={visitorLocation}
        locationLoading={locationLoading}
        locationError={locationError}
        refreshNearbyLocation={refreshNearbyLocation}
      />

      {/* Destination browsing and search results */}
      <ExploreDestinations
        categories={categories}
        category={category}
        setCategory={setCategory}
        categoryCounts={categoryCounts}
        submittedQuery={submittedQuery}
        resetFilters={resetFilters}
        loading={loading}
        error={error}
        loadDestinations={loadDestinations}
        filteredDestinations={filteredDestinations}
        paginatedDestinations={paginatedDestinations}
        destinationPage={destinationPage}
        setDestinationPage={setDestinationPage}
        hasFilters={hasFilters}
        showSort={showSort}
        setShowSort={setShowSort}
        sortBy={sortBy}
        setSortBy={setSortBy}
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

      {/* Shared Outside Kaduna modal */}
      <OutsideKadunaModal
        isOpen={showOutsideKadunaModal}
        onClose={closeOutsideKadunaModal}
      />

      {/* Footer */}
      <Footer />
    </main>
  );
}

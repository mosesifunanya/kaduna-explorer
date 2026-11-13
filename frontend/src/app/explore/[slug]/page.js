"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import DestinationLoading from "@/components/destination-details/DestinationLoading";
import DestinationErrorState from "@/components/destination-details/DestinationErrorState";
import DestinationBreadcrumb from "@/components/destination-details/DestinationBreadcrumb";
import DestinationDetailsMain from "@/components/destination-details/DestinationDetailsMain";
import DestinationDetailsModals from "@/components/destination-details/DestinationDetailsModals";

import useDestinationDetailsPage from "@/hooks/destination/useDestinationDetailsPage";

function DestinationDetailsContent() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const page = useDestinationDetailsPage(slug);

  if (page.loading) {
    return <DestinationLoading />;
  }

  if (page.error || page.notFound || !page.destination) {
    return (
      <DestinationErrorState
        error={page.error}
        onRetry={page.loadDestination}
      />
    );
  }

  const nearbySearchProps = {
    nearbyQuery: page.nearbyQuery,
    setNearbyQuery: page.setNearbyQuery,

    nearbyPlaces: page.nearbyPlaces,
    setNearbyPlaces: page.setNearbyPlaces,
    nearbyLoading: page.nearbyLoading,
    nearbyError: page.nearbyError,
    setNearbyError: page.setNearbyError,
    nearbySearched: page.nearbySearched,
    setNearbySearched: page.setNearbySearched,

    searchRadiusKm: page.searchRadiusKm,
    handleSearchRadiusChange: page.handleSearchRadiusChange,

    nearbyPage: page.nearbyPage,
    setNearbyPage: page.setNearbyPage,

    nearbyHasMore: page.nearbyHasMore,
    nearbyLoadingMore: page.nearbyLoadingMore,
    showMoreNearbyPlaces: page.showMoreNearbyPlaces,

    gpsEnabled: page.gpsEnabled,
    gpsPlaces: page.gpsPlaces,
    setGpsPlaces: page.setGpsPlaces,
    gpsPlacesLoading: page.gpsPlacesLoading,
    gpsPlacesError: page.gpsPlacesError,
    setGpsPlacesError: page.setGpsPlacesError,
    gpsPlacesSearched: page.gpsPlacesSearched,
    setGpsPlacesSearched: page.setGpsPlacesSearched,
    gpsPage: page.gpsPage,
    setGpsPage: page.setGpsPage,

    gpsHasMore: page.gpsHasMore,
    gpsLoadingMore: page.gpsLoadingMore,
    showMoreGpsPlaces: page.showMoreGpsPlaces,

    visitorLocation: page.visitorLocation,
    locationLoading: page.locationLoading,
    locationError: page.locationError,

    cancelNearbySearch: page.cancelNearbySearch,
    searchNearbyPlaces: page.searchNearbyPlaces,

    disableVisitorLocation: page.disableVisitorLocation,
    requestVisitorLocation: page.requestVisitorLocation,
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[#FAF9F6] text-[#192A35]">
      <Header activeNav="explore" />

      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <DestinationBreadcrumb destinationName={page.destination.name} />

        <DestinationDetailsMain
          destination={page.destination}
          gallery={page.gallery}
          activeImage={page.activeImage}
          setActiveImage={page.setActiveImage}
          setViewerOpen={page.setViewerOpen}
          categoryLabel={page.categoryLabel}
          locationLabel={page.locationLabel}
          directionsToDestination={page.directionsToDestination}
          copied={page.copied}
          shareDestination={page.shareDestination}
          mapEmbedUrl={page.mapEmbedUrl}
          nearbySearchProps={nearbySearchProps}
          priceLabel={page.priceLabel}
          phone={page.phone}
          email={page.email}
          websiteUrl={page.websiteUrl}
          relatedDestinations={page.relatedDestinations}
        />
      </div>

      <Footer />

      <DestinationDetailsModals
        destinationName={page.destination.name}
        gallery={page.gallery}
        viewerOpen={page.viewerOpen}
        setViewerOpen={page.setViewerOpen}
        activeImage={page.activeImage}
        setActiveImage={page.setActiveImage}
        showOutsideKadunaModal={page.showOutsideKadunaModal}
        setShowOutsideKadunaModal={page.setShowOutsideKadunaModal}
      />
    </main>
  );
}

export default function DestinationDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF9F6]">
          <div className="mx-auto max-w-[1280px] animate-pulse px-4 py-8 sm:px-6">
            <div className="h-4 w-44 rounded bg-[#E7E4DB]" />
            <div className="mt-6 h-[280px] rounded-3xl bg-[#E7E4DB] sm:h-[430px]" />
            <div className="mt-7 h-9 w-2/3 rounded bg-[#E7E4DB]" />
            <div className="mt-4 h-4 w-full max-w-2xl rounded bg-[#E7E4DB]" />
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="h-24 rounded-2xl bg-[#E7E4DB]" />
              <div className="h-24 rounded-2xl bg-[#E7E4DB]" />
              <div className="h-24 rounded-2xl bg-[#E7E4DB]" />
            </div>
          </div>
        </main>
      }
    >
      <DestinationDetailsContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "motion/react";

import {
  Check,
  MapPin,
  Navigation,
  Share2,
  Sparkles,
  Plus,
  X,
  CalendarDays,
  Plane,
  Loader2,
  ArrowLeft,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";

import DestinationFavorite from "@/components/destination-details/DestinationFavorite";
import { useAuth } from "@/components/AuthProvider";

import { apiRequest } from "@/lib/api";

function getDestinationId(destination) {
  return destination?._id || destination?.id || null;
}

function getTripDestinationId(item) {
  const value = item?.destination ?? item;

  if (typeof value === "string") return value;

  return value?._id || value?.id || null;
}

function tripHasDestination(trip, destinationId) {
  if (!destinationId || !Array.isArray(trip?.destinations)) return false;

  return trip.destinations.some(
    (item) => String(getTripDestinationId(item)) === String(destinationId),
  );
}

export default function DestinationOverview({
  destination,
  categoryLabel,
  locationLabel,
  directionsUrl,
  copied,
  onShare,
}) {
  const { authStatus } = useAuth();

  const description =
    destination.description ||
    destination.shortDescription ||
    "More information about this destination will be added soon.";

  const destinationId = getDestinationId(destination);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState("loading");
  const [trips, setTrips] = useState([]);
  const [hasDestinationInTrip, setHasDestinationInTrip] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  // Use the shared authentication state and load trips only when
  // the visitor opens the protected Add to Trip action.
  useEffect(() => {
    if (!modalOpen || modalView !== "loading" || authStatus === "checking") {
      return undefined;
    }

    if (authStatus !== "authenticated") {
      setModalView("login");
      return undefined;
    }

    let isActive = true;

    const loadUserTrips = async () => {
      if (!destinationId) {
        setMessage("This destination could not be identified.");
        setMessageType("error");
        setModalView("error");
        return;
      }

      try {
        const response = await apiRequest("/trips");

        const userTrips = Array.isArray(response?.data?.trips)
          ? response.data.trips
          : [];

        if (!isActive) return;

        setTrips(userTrips);
        setHasDestinationInTrip(
          userTrips.some((trip) => tripHasDestination(trip, destinationId)),
        );
        setModalView("select");
      } catch (error) {
        if (!isActive) return;

        setMessage(error.message || "Unable to load your trips.");
        setMessageType("error");
        setModalView("error");
      }
    };

    void loadUserTrips();

    return () => {
      isActive = false;
    };
  }, [modalOpen, modalView, authStatus, destinationId]);

  const [tripForm, setTripForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "planned",
  });

  const destinationImage =
    typeof destination.coverImage === "string"
      ? destination.coverImage
      : destination.coverImage?.url ||
        destination.images?.[0]?.url ||
        destination.images?.[0] ||
        "";

  // Close the modal without preventing the user from leaving
  // while a request is processing.
  const closeModal = () => {
    setModalOpen(false);
    setMessage("");
    setModalView("loading");
  };

  // Open the modal; the effect above handles authentication and trip loading.
  const openTripModal = () => {
    setModalOpen(true);
    setModalView("loading");
    setMessage("");
    setMessageType("error");
    setSelectedTrip("");
  };

  // Add the current destination to an existing trip.
  const addDestinationToTrip = async (trip) => {
    if (!destinationId) {
      throw new Error("This destination could not be identified.");
    }

    const existingDestinations = Array.isArray(trip.destinations)
      ? trip.destinations
      : [];

    const alreadyAdded = existingDestinations.some(
      (item) => String(getTripDestinationId(item)) === String(destinationId),
    );

    if (alreadyAdded) {
      return { alreadyAdded: true };
    }

    const itinerary = existingDestinations.map((item, index) => ({
      destination: getTripDestinationId(item),
      ...(item.visitDate ? { visitDate: item.visitDate } : {}),
      order: item.order ?? index,
      visitStatus: item.visitStatus || "planned",
    }));

    itinerary.push({
      destination: destinationId,
      order: itinerary.length,
      visitStatus: "planned",
    });

    const tripId = trip._id || trip.id;

    if (!tripId) {
      throw new Error("The selected trip could not be identified.");
    }

    await apiRequest(`/trips/${tripId}`, {
      method: "PATCH",
      body: {
        destinations: itinerary,
      },
    });

    return { alreadyAdded: false };
  };

  // Add destination to the selected trip.
  const handleAddToExistingTrip = async () => {
    if (loading) return;

    if (!selectedTrip) {
      setMessage("Please select a trip first.");
      setMessageType("error");
      return;
    }

    const trip = trips.find(
      (item) => String(item._id || item.id) === String(selectedTrip),
    );

    if (!trip) {
      setMessage("The selected trip could not be found.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await addDestinationToTrip(trip);

      setHasDestinationInTrip(true);

      setMessage(
        result.alreadyAdded
          ? "This destination is already in your trip."
          : `${destination.name} has been added to your trip.`,
      );

      setMessageType("success");
      setModalView("success");
    } catch (error) {
      setMessage(error.message || "Unable to add this destination.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Create a new trip with the current destination.
  const handleCreateTrip = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!destinationId) {
      setMessage("This destination could not be identified.");
      setMessageType("error");
      return;
    }

    const name = tripForm.name.trim();
    const startDate = tripForm.startDate;
    const endDate = tripForm.endDate;

    if (!name) {
      setMessage("Please enter a name for your trip.");
      setMessageType("error");
      return;
    }

    if (!startDate || !endDate) {
      setMessage("Please select both your start date and end date.");
      setMessageType("error");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setMessage("The end date cannot be before the start date.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiRequest("/trips", {
        method: "POST",
        body: {
          name,
          description: tripForm.description.trim(),
          startDate,
          endDate,
          status: tripForm.status,
          destinations: [
            {
              destination: destinationId,
              order: 0,
              visitStatus: "planned",
            },
          ],
        },
      });

      setHasDestinationInTrip(true);

      setMessage(
        `Your trip has been created with ${destination.name} added to the itinerary.`,
      );

      setMessageType("success");
      setModalView("success");
    } catch (error) {
      setMessage(error.message || "Unable to create your trip.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/explore";

    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="min-w-0 border-b border-[#E8E9E2] bg-[#FAF9F6] py-6 sm:py-8"
      >
        {/* Destination category */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {categoryLabel && (
            <span className="inline-flex items-center rounded-full bg-[#EAF1EB] px-3 py-1.5 font-[family-name:var(--font-inter)] text-[10px] font-semibold tracking-wide text-[#174B35] sm:text-xs">
              {categoryLabel}
            </span>
          )}

          {destination.isFeatured && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3D9] px-3 py-1.5 font-[family-name:var(--font-inter)] text-[10px] font-semibold tracking-wide text-[#94630C] sm:text-xs">
              <Sparkles size={12} />
              Featured destination
            </span>
          )}
        </div>

        {/* Destination title and actions */}
        <div className="mt-3 flex min-w-0 flex-col gap-4 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-[family-name:var(--font-playfair)] text-[27px] font-semibold leading-[1.2] tracking-[-0.035em] text-[#174B35] sm:text-3xl lg:text-4xl">
              {destination.name}
            </h1>

            {locationLabel && (
              <p className="mt-2 flex min-w-0 items-start gap-2 font-[family-name:var(--font-inter)] text-[11px] leading-5 text-[#78827B] sm:text-sm sm:leading-6">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#B1842D]" />
                <span className="min-w-0 break-words">{locationLabel}</span>
              </p>
            )}
          </div>

          {/* Destination actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DestinationFavorite
              destination={destination}
              variant="overview"
              showLabel
              className="shrink-0"
            />

            <button
              type="button"
              onClick={openTripModal}
              aria-label={
                hasDestinationInTrip
                  ? `${destination.name} is already in a trip. Manage trips`
                  : `Add ${destination.name} to a trip`
              }
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 font-[family-name:var(--font-inter)] text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-xs ${
                hasDestinationInTrip
                  ? "border-[#BFD7C4] bg-[#EAF3EB] text-[#174B35] hover:bg-[#DDEBDD] focus-visible:ring-[#397B55]"
                  : "border-[#D9A21B] bg-[#FFF8E8] text-[#76530D] hover:bg-[#FFF0CF] focus-visible:ring-[#D9A21B]"
              }`}
            >
              {hasDestinationInTrip ? <Check size={14} /> : <Plus size={14} />}
              {hasDestinationInTrip ? "Added to Trip" : "Add to Trip"}
            </button>

            <button
              type="button"
              onClick={onShare}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#DDE3DC] bg-white px-4 py-2 font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[#31523F] transition-colors hover:border-[#174B35] hover:bg-[#F0F5EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] focus-visible:ring-offset-2 sm:text-xs"
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              {copied ? "Link copied" : "Share"}
            </button>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#174B35] px-4 py-2 font-[family-name:var(--font-inter)] text-[11px] font-semibold text-white transition-colors hover:bg-[#103A28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#174B35] focus-visible:ring-offset-2 sm:text-xs"
              >
                <Navigation size={14} />
                Directions
              </a>
            )}
          </div>
        </div>

        {/* Destination description */}
        <div className="mt-6 max-w-4xl sm:mt-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="h-px w-6 bg-[#D9A21B]" />

            <p className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.2em] text-[#A87912] sm:text-[10px]">
              Discover this place
            </p>
          </div>

          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold leading-tight text-[#174B35] sm:text-xl">
            About this destination
          </h2>

          <p className="mt-2 whitespace-pre-line font-[family-name:var(--font-inter)] text-[12px] leading-[1.85] text-[#68736C] sm:text-sm sm:leading-7">
            {description}
          </p>
        </div>
      </motion.section>

      {/* Add to Trip modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#10251B]/65 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="trip-modal-title"
              className="relative my-auto w-full max-w-[470px] overflow-hidden rounded-2xl border border-[#E7EAE3] bg-[#FAF9F6] shadow-2xl"
            >
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#E4E8E1] bg-white text-[#64736A] transition hover:bg-[#F0F4EF]"
              >
                <X size={16} />
              </button>

              <div className="border-b border-[#E8E9E2] px-5 py-5 pr-14 sm:px-6">
                <div className="mb-2 flex items-center gap-2 text-[#A87912]">
                  <Plane size={15} />
                  <span className="font-[family-name:var(--font-inter)] text-[9px] font-bold uppercase tracking-[0.2em]">
                    Your travel planner
                  </span>
                </div>

                <h2
                  id="trip-modal-title"
                  className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#174B35] sm:text-2xl"
                >
                  {modalView === "create"
                    ? "Create a new trip"
                    : modalView === "login"
                      ? "Sign in to plan your trip"
                      : modalView === "success"
                        ? "You're all set"
                        : "Add to your trip"}
                </h2>

                <p className="mt-1 font-[family-name:var(--font-inter)] text-xs leading-5 text-[#778078]">
                  {modalView === "create"
                    ? "Give your journey a name and choose your travel dates."
                    : modalView === "login"
                      ? "Sign in or create an account to save destinations to your personal itinerary."
                      : modalView === "success"
                        ? "Your travel plans have been updated."
                        : "Choose a trip for this destination or create a new one."}
                </p>
              </div>

              <div className="max-h-[min(70vh,620px)] overflow-y-auto px-5 py-5 sm:px-6">
                {/* Destination preview */}
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#E6EAE2] bg-white p-2.5">
                  {destinationImage ? (
                    <img
                      src={destinationImage}
                      alt={destination.name}
                      className="h-14 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg bg-[#EAF1EB] text-[#174B35]">
                      <MapPin size={20} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-[family-name:var(--font-inter)] text-[9px] font-semibold uppercase tracking-wider text-[#A87912]">
                      Destination
                    </p>

                    <p className="mt-1 truncate font-[family-name:var(--font-inter)] text-sm font-semibold text-[#174B35]">
                      {destination.name}
                    </p>

                    {locationLabel && (
                      <p className="mt-0.5 truncate font-[family-name:var(--font-inter)] text-[10px] text-[#818B83]">
                        {locationLabel}
                      </p>
                    )}
                  </div>
                </div>

                {/* Loading */}
                {modalView === "loading" && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Loader2
                      size={25}
                      className="animate-spin text-[#174B35]"
                    />
                    <p className="mt-3 text-xs text-[#778078]">
                      Loading your trips...
                    </p>
                  </div>
                )}

                {/* Error */}
                {modalView === "error" && (
                  <div className="py-5 text-center">
                    <p className="text-sm font-medium text-[#A33B32]">
                      {message}
                    </p>

                    <button
                      type="button"
                      onClick={openTripModal}
                      className="mt-4 rounded-full bg-[#174B35] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#103A28]"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Login */}
                {modalView === "login" && (
                  <div className="py-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1EB] text-[#174B35]">
                      <LockKeyhole size={23} />
                    </div>

                    <h3 className="mt-4 font-[family-name:var(--font-playfair)] text-lg font-semibold text-[#174B35]">
                      Your journey starts here
                    </h3>

                    <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-[#778078]">
                      Create an account or sign in to organise your Kaduna
                      adventures and keep your destinations in one place.
                    </p>

                    <button
                      type="button"
                      onClick={goToLogin}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#174B35] px-5 text-xs font-semibold text-white transition hover:bg-[#103A28]"
                    >
                      Sign in or create account
                    </button>
                  </div>
                )}

                {/* Select an existing trip */}
                {modalView === "select" && (
                  <div>
                    {trips.length > 0 ? (
                      <>
                        <label
                          htmlFor="existing-trip"
                          className="mb-2 block font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[#31523F]"
                        >
                          Choose an existing trip
                        </label>

                        <select
                          id="existing-trip"
                          value={selectedTrip}
                          onChange={(event) => {
                            setSelectedTrip(event.target.value);
                            setMessage("");
                          }}
                          className="min-h-11 w-full rounded-xl border border-[#DDE5DA] bg-white px-3 text-xs text-[#31523F] outline-none transition focus:border-[#174B35] focus:ring-2 focus:ring-[#174B35]/10"
                        >
                          <option value="">Select a trip</option>

                          {trips.map((trip) => (
                            <option
                              key={trip._id || trip.id}
                              value={trip._id || trip.id}
                              disabled={tripHasDestination(trip, destinationId)}
                            >
                              {trip.name}
                              {tripHasDestination(trip, destinationId)
                                ? " (Already added)"
                                : ""}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={handleAddToExistingTrip}
                          disabled={!selectedTrip || loading}
                          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#174B35] px-5 text-xs font-semibold text-white transition hover:bg-[#103A28] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Plus size={15} />
                          )}

                          {loading
                            ? "Adding destination..."
                            : "Add destination to trip"}
                        </button>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#D7DFD5] bg-white px-4 py-6 text-center">
                        <CalendarDays
                          size={23}
                          className="mx-auto text-[#A87912]"
                        />

                        <p className="mt-3 text-sm font-semibold text-[#31523F]">
                          No trips yet
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[#818B83]">
                          Create your first trip and start building your
                          itinerary.
                        </p>
                      </div>
                    )}

                    {message && (
                      <p
                        className={`mt-3 text-center text-xs ${
                          messageType === "success"
                            ? "text-[#174B35]"
                            : "text-[#A33B32]"
                        }`}
                      >
                        {message}
                      </p>
                    )}

                    <div className="my-5 flex items-center gap-3">
                      <span className="h-px flex-1 bg-[#E7EAE3]" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#9AA39B]">
                        Or
                      </span>
                      <span className="h-px flex-1 bg-[#E7EAE3]" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setMessageType("error");
                        setModalView("create");
                      }}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#D9A21B] bg-[#FFF8E8] px-5 text-xs font-semibold text-[#76530D] transition hover:bg-[#FFF0CF]"
                    >
                      <Plus size={15} />
                      Create a new trip
                    </button>
                  </div>
                )}

                {/* Create a new trip */}
                {modalView === "create" && (
                  <form onSubmit={handleCreateTrip} className="space-y-4">
                    <div>
                      <label
                        htmlFor="new-trip-name"
                        className="mb-1.5 block text-[11px] font-semibold text-[#31523F]"
                      >
                        Trip name
                      </label>

                      <input
                        id="new-trip-name"
                        type="text"
                        required
                        maxLength={100}
                        value={tripForm.name}
                        onChange={(event) =>
                          setTripForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="e.g. My Kaduna Adventure"
                        className="min-h-11 w-full rounded-xl border border-[#DDE5DA] bg-white px-3 text-xs text-[#31523F] outline-none transition placeholder:text-[#A1AAA2] focus:border-[#174B35] focus:ring-2 focus:ring-[#174B35]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="new-trip-description"
                        className="mb-1.5 block text-[11px] font-semibold text-[#31523F]"
                      >
                        Description{" "}
                        <span className="font-normal text-[#929B93]">
                          Optional
                        </span>
                      </label>

                      <textarea
                        id="new-trip-description"
                        rows={2}
                        maxLength={1000}
                        value={tripForm.description}
                        onChange={(event) =>
                          setTripForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="What would you like to experience?"
                        className="w-full resize-y rounded-xl border border-[#DDE5DA] bg-white px-3 py-3 text-xs text-[#31523F] outline-none transition placeholder:text-[#A1AAA2] focus:border-[#174B35] focus:ring-2 focus:ring-[#174B35]/10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="new-trip-start"
                          className="mb-1.5 block text-[11px] font-semibold text-[#31523F]"
                        >
                          Start date
                        </label>

                        <input
                          id="new-trip-start"
                          type="date"
                          required
                          value={tripForm.startDate}
                          onChange={(event) => {
                            const startDate = event.target.value;

                            setTripForm((current) => ({
                              ...current,
                              startDate,
                              endDate:
                                current.endDate && current.endDate < startDate
                                  ? ""
                                  : current.endDate,
                            }));
                          }}
                          className="min-h-11 w-full min-w-0 rounded-xl border border-[#DDE5DA] bg-white px-2 text-[11px] text-[#31523F] outline-none focus:border-[#174B35] sm:px-3 sm:text-xs"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="new-trip-end"
                          className="mb-1.5 block text-[11px] font-semibold text-[#31523F]"
                        >
                          End date
                        </label>

                        <input
                          id="new-trip-end"
                          type="date"
                          required
                          min={tripForm.startDate || undefined}
                          value={tripForm.endDate}
                          onChange={(event) =>
                            setTripForm((current) => ({
                              ...current,
                              endDate: event.target.value,
                            }))
                          }
                          className="min-h-11 w-full min-w-0 rounded-xl border border-[#DDE5DA] bg-white px-2 text-[11px] text-[#31523F] outline-none focus:border-[#174B35] sm:px-3 sm:text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="new-trip-status"
                        className="mb-1.5 block text-[11px] font-semibold text-[#31523F]"
                      >
                        Trip status
                      </label>

                      <select
                        id="new-trip-status"
                        value={tripForm.status}
                        onChange={(event) =>
                          setTripForm((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                        className="min-h-11 w-full rounded-xl border border-[#DDE5DA] bg-white px-3 text-xs text-[#31523F] outline-none focus:border-[#174B35]"
                      >
                        <option value="planned">Planned</option>
                        <option value="ongoing">Ongoing</option>
                      </select>
                    </div>

                    {message && (
                      <p role="alert" className="text-xs text-[#A33B32]">
                        {message}
                      </p>
                    )}

                    <div className="flex gap-2 border-t border-[#E7EAE3] pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setMessage("");
                          setMessageType("error");
                          setModalView("select");
                        }}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#DDE5DA] bg-white px-4 text-xs font-semibold text-[#53665A] transition hover:bg-[#F0F4EF]"
                      >
                        <ArrowLeft size={14} />
                        Back
                      </button>

                      <button
                        type="submit"
                        disabled={loading || !tripForm.name.trim()}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#174B35] px-4 text-xs font-semibold text-white transition hover:bg-[#103A28] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Plus size={15} />
                        )}

                        {loading ? "Creating trip..." : "Create trip"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Success */}
                {modalView === "success" && (
                  <div className="py-5 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1EB] text-[#174B35]">
                      <CheckCircle2 size={28} />
                    </div>

                    <p className="mx-auto mt-4 max-w-xs text-sm font-medium leading-6 text-[#31523F]">
                      {message}
                    </p>

                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#174B35] px-5 text-xs font-semibold text-white transition hover:bg-[#103A28]"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

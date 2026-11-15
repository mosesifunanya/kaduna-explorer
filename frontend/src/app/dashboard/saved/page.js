"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  Compass,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  LoaderCircle,
  ImageIcon,
  RefreshCw,
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OptimizedImage from "@/components/OptimizedImage";
import useDestinationFavorite from "@/hooks/destination/useDestinationFavorite";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

function extractEventFavorites(response) {
  const candidates = [
    response?.data?.favorites,
    response?.data?.data?.favorites,
    response?.favorites,
    response?.data?.data,
    response?.data,
    response,
  ];

  return candidates.find(Array.isArray) || [];
}

function getFavoriteEvent(favorite) {
  const event = favorite?.event;

  return event && typeof event === "object" ? event : null;
}

function getEventId(event) {
  return String(event?._id || event?.id || "");
}

function getEventImage(event) {
  const cover = event?.coverImage;

  if (typeof cover === "string" && cover.trim()) return cover.trim();
  if (typeof cover?.url === "string" && cover.url.trim())
    return cover.url.trim();

  const firstImage = Array.isArray(event?.images) ? event.images[0] : null;

  if (typeof firstImage === "string") return firstImage.trim();
  return firstImage?.url?.trim?.() || firstImage?.secure_url?.trim?.() || "";
}

function getEventDate(value) {
  if (!value) return "Date to be announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be announced";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function getEventHref(event) {
  const identifier = event?.slug || getEventId(event);
  return identifier
    ? `/events/${encodeURIComponent(String(identifier))}`
    : "/events";
}

function getEventLocation(event) {
  return (
    [event?.venue, event?.address, event?.city, event?.lga, event?.state]
      .filter((value) => typeof value === "string" && value.trim())
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(", ") || "Location to be announced"
  );
}

function getEventPrice(event) {
  if (event?.isFree || event?.price === 0 || event?.entranceFee === 0) {
    return "Free entry";
  }

  const price = event?.price ?? event?.entranceFee;
  return price !== undefined && price !== null && price !== ""
    ? `₦${Number(price).toLocaleString("en-NG")}`
    : "";
}

function getDestination(favorite) {
  if (!favorite) return null;

  return typeof favorite.destination === "object" ? favorite.destination : null;
}

function getDestinationId(favorite) {
  const destination = getDestination(favorite);

  return String(
    destination?._id ||
      (typeof favorite?.destination === "string" ? favorite.destination : ""),
  );
}

function getDestinationImage(destination) {
  const cover = destination?.coverImage;

  if (typeof cover === "string" && cover.trim()) {
    return cover.trim();
  }

  if (typeof cover?.url === "string" && cover.url.trim()) {
    return cover.url.trim();
  }

  const firstImage = destination?.images?.[0];

  if (typeof firstImage === "string") {
    return firstImage.trim();
  }

  return firstImage?.url?.trim?.() || firstImage?.secure_url?.trim?.() || "";
}

function getDestinationLocation(destination) {
  return (
    destination?.locationLabel ||
    [
      destination?.address,
      destination?.lga,
      destination?.city,
      destination?.state,
    ]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim())
      .filter((value, index, array) => array.indexOf(value) === index)
      .join(", ") ||
    "Kaduna State"
  );
}

function getDestinationHref(destination) {
  const identifier = destination?.slug || destination?._id;

  return identifier
    ? `/explore/${encodeURIComponent(String(identifier))}`
    : "/explore";
}

function formatCategory(destination) {
  return String(
    destination?.categoryLabel || destination?.category || "Destination",
  ).replaceAll("-", " ");
}

const reveal = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

/* =========================================
   LOADING CARD
========================================= */

function SavedCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E7ECE5] bg-white">
      <div className="aspect-[16/10] animate-pulse bg-[#E9EEE8]" />

      <div className="space-y-4 p-4 sm:p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#E9EEE8]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#EEF1EC]" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-[#EEF1EC]" />
      </div>
    </div>
  );
}

/* =========================================
   REMOVE CONFIRMATION
========================================= */

function RemoveConfirmation({
  destinationName,
  loading,
  onCancel,
  onConfirm,
  reduceMotion,
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#071B12]/65 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-saved-title"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        className="w-full max-w-[390px] overflow-hidden rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_25px_90px_rgba(0,0,0,0.25)] sm:p-7"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0ED] text-[#D45B4F]">
            <Trash2 size={22} />
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close confirmation"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#78867B] transition hover:bg-[#F1F4F0] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <h2
          id="remove-saved-title"
          className="mt-5 text-xl font-extrabold tracking-tight text-[#183B2A]"
        >
          Remove saved destination?
        </h2>

        <p className="mt-2 break-words text-sm leading-6 text-[#718075]">
          Are you sure you want to remove{" "}
          <span className="font-bold text-[#315B43]">{destinationName}</span>{" "}
          from your personal collection?
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex min-h-12 items-center justify-center rounded-xl border border-[#E1E8E0] px-3 text-sm font-bold text-[#526B5A] transition hover:bg-[#F5F8F4] disabled:opacity-50"
          >
            Keep saved
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B9473D] px-3 text-sm font-bold text-white transition hover:bg-[#A63830] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}

            {loading ? "Removing..." : "Remove"}
          </button>
        </div>
      </motion.section>
    </div>
  );
}

/* =========================================
   SAVED DESTINATION CARD
========================================= */

function SavedDestinationCard({
  favorite,
  onRequestRemove,
  reduceMotion,
  index,
}) {
  const destination = getDestination(favorite);

  const { isPending } = useDestinationFavorite(destination);

  const [imageFailed, setImageFailed] = useState(false);

  if (!destination) return null;

  const image = getDestinationImage(destination);
  const name = destination.name || "Untitled destination";
  const href = getDestinationHref(destination);
  const category = formatCategory(destination);
  const location = getDestinationLocation(destination);

  return (
    <motion.article
      variants={reveal}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: reduceMotion ? 0 : 0.45,
        delay: reduceMotion ? 0 : Math.min(index * 0.06, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#E5EBE4] bg-white shadow-[0_4px_18px_rgba(22,55,35,0.035)] transition-shadow duration-300 hover:border-[#C9D8CA] hover:shadow-[0_18px_38px_rgba(22,55,35,0.10)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#E8EEE8]">
        {image && !imageFailed ? (
          <OptimizedImage
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.055]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#103C2A] via-[#285D43] to-[#718C68] text-white">
            <ImageIcon size={35} className="mb-2 text-[#FFBD4A]" />
            <span className="text-xs font-medium text-white/80">
              Destination image unavailable
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#071B12]/70 via-[#071B12]/15 to-transparent" />

        <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full border border-white/30 bg-[#103C2A]/75 px-3 py-1.5 text-[10px] font-bold capitalize text-white shadow-sm backdrop-blur-md">
          {category}
        </span>

        <span className="absolute bottom-3 left-3 right-3 line-clamp-2 text-base font-extrabold leading-snug text-white drop-shadow sm:text-lg">
          {name}
        </span>

        <button
          type="button"
          onClick={() => onRequestRemove(favorite)}
          disabled={isPending}
          aria-label={`Remove ${name} from saved destinations`}
          title="Remove from saved destinations"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#D45149] shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-[#FFF0ED] active:scale-95 disabled:opacity-50"
        >
          {isPending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Heart size={18} fill="currentColor" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-2 text-xs leading-5 text-[#718174]">
          <MapPin size={15} className="mt-0.5 shrink-0 text-[#087747]" />
          <span className="line-clamp-2 break-words">{location}</span>
        </div>

        {(destination.shortDescription || destination.description) && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-[1.7] text-[#68796D]">
            {destination.shortDescription || destination.description}
          </p>
        )}

        <div className="mt-auto border-t border-[#EDF1EC] pt-4">
          <Link
            href={href}
            className="group/link flex min-h-11 items-center justify-between gap-2 rounded-xl bg-[#103C2A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#18543A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFBD4A]/40"
          >
            View destination
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover/link:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function SavedEventCard({ favorite, index, reduceMotion, onRemove, removing }) {
  const event = getFavoriteEvent(favorite);
  const [imageFailed, setImageFailed] = useState(false);

  if (!event) return null;

  const id = getEventId(event);
  const image = getEventImage(event);
  const title = event.title || event.name || "Untitled event";
  const category =
    event.categoryLabel ||
    String(event.category || "Event").replaceAll("-", " ");
  const price = getEventPrice(event);

  return (
    <motion.article
      variants={reveal}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: reduceMotion ? 0 : 0.45,
        delay: reduceMotion ? 0 : Math.min(index * 0.06, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#E5EBE4] bg-white shadow-[0_4px_18px_rgba(22,55,35,0.035)] transition-shadow duration-300 hover:border-[#C9D8CA] hover:shadow-[0_18px_38px_rgba(22,55,35,0.10)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#E8EEE8]">
        {image && !imageFailed ? (
          <OptimizedImage
            src={image}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.055]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#103C2A] via-[#285D43] to-[#718C68] text-white">
            <ImageIcon size={35} className="mb-2 text-[#FFBD4A]" />
            <span className="text-xs font-medium text-white/80">
              Event image unavailable
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#071B12]/70 via-[#071B12]/15 to-transparent" />
        <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full border border-white/30 bg-[#103C2A]/75 px-3 py-1.5 text-[10px] font-bold capitalize text-white shadow-sm backdrop-blur-md">
          {category}
        </span>
        <span className="absolute bottom-3 left-3 right-3 line-clamp-2 text-base font-extrabold leading-snug text-white drop-shadow sm:text-lg">
          {title}
        </span>

        <button
          type="button"
          onClick={() => onRemove(id)}
          disabled={!id || removing}
          aria-label={`Remove ${title} from saved events`}
          title="Remove from saved events"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/95 text-[#D45149] shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-[#FFF0ED] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removing ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Heart size={18} fill="currentColor" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="space-y-2 text-xs leading-5 text-[#718174]">
          <p className="flex items-center gap-2">
            <Sparkles size={15} className="shrink-0 text-[#087747]" />
            {getEventDate(event.startDate)}
          </p>
          <p className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-[#087747]" />
            <span className="line-clamp-2 break-words">
              {getEventLocation(event)}
            </span>
          </p>
          {price && <p className="font-bold text-[#315B43]">{price}</p>}
        </div>

        {(event.shortDescription || event.description) && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-[1.7] text-[#68796D]">
            {event.shortDescription || event.description}
          </p>
        )}

        <div className="mt-auto border-t border-[#EDF1EC] pt-4">
          <Link
            href={getEventHref(event)}
            className="group/link flex min-h-11 items-center justify-between gap-2 rounded-xl bg-[#103C2A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#18543A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFBD4A]/40"
          >
            View event
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover/link:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

/* =========================================
   EMPTY COLLECTION
========================================= */

function EmptyCollection() {
  return (
    <section className="flex flex-col items-center rounded-[26px] border border-dashed border-[#D5E0D4] bg-white px-5 py-14 text-center sm:py-20">
      <div className="relative flex h-[86px] w-[86px] items-center justify-center rounded-[28px] bg-[#EAF2E9] text-[#18543A]">
        <Bookmark size={36} strokeWidth={1.6} />

        <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-[#FFBD4A] text-[#103C2A]">
          <Heart size={12} fill="currentColor" />
        </span>
      </div>

      <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A17A34]">
        Your collection awaits
      </p>

      <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#183B2A] sm:text-2xl">
        No saved destinations yet
      </h2>

      <p className="mt-3 max-w-[390px] text-sm leading-6 text-[#778579]">
        Discover beautiful places across Kaduna, save the destinations you love
        and keep your personal travel collection in one place.
      </p>

      <Link
        href="/explore"
        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#103C2A]/10 transition hover:bg-[#18543A] active:scale-[0.98]"
      >
        <Compass size={18} />
        Explore destinations
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}

/* =========================================
   MAIN SAVED PLACES PAGE
========================================= */

export default function SavedPlacesPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { authStatus } = useAuth();

  const [eventFavorites, setEventFavorites] = useState([]);
  const [eventFavoritesLoading, setEventFavoritesLoading] = useState(true);
  const [eventFavoritesError, setEventFavoritesError] = useState("");
  const [removingEventId, setRemovingEventId] = useState("");

  const loadEventFavorites = useCallback(async () => {
    setEventFavoritesLoading(true);
    setEventFavoritesError("");

    try {
      const response = await apiRequest("event-favorites", {
        method: "GET",
      });
      const loadedFavorites = extractEventFavorites(response);
      setEventFavorites(
        loadedFavorites.filter((favorite) => getFavoriteEvent(favorite)),
      );
    } catch (err) {
      setEventFavorites([]);
      setEventFavoritesError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Unable to load your saved events.",
      );
    } finally {
      setEventFavoritesLoading(false);
    }
  }, []);

  // Saved collections are private. Wait for the shared session check before
  // loading anything, and send guests to login with this page as their return
  // destination.
  useEffect(() => {
    if (authStatus === "checking") return;

    if (authStatus === "unauthenticated") {
      router.replace(
        `/login?returnTo=${encodeURIComponent("/dashboard/saved")}`,
      );
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    loadEventFavorites();
  }, [authStatus, loadEventFavorites]);

  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [pageError, setPageError] = useState("");

  // Bind the shared hook to the destination selected for removal.
  // It also loads the favourites collection when the page first mounts.
  const { favorites, loading, error, refreshFavorites, unsaveFavorite } =
    useDestinationFavorite(getDestination(selectedFavorite));

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const visibleFavorites = useMemo(() => {
    const validFavorites = favorites.filter((favorite) => {
      return Boolean(getDestination(favorite));
    });

    const normalizedSearch = search.trim().toLowerCase();

    const filtered = validFavorites.filter((favorite) => {
      const destination = getDestination(favorite);

      if (!normalizedSearch) return true;

      const searchableText = [
        destination?.name,
        destination?.category,
        destination?.categoryLabel,
        destination?.address,
        destination?.city,
        destination?.lga,
        destination?.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }

      if (sortBy === "alphabetical") {
        return (getDestination(a)?.name || "").localeCompare(
          getDestination(b)?.name || "",
        );
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [favorites, search, sortBy]);

  async function handleConfirmRemove() {
    if (!selectedFavorite || removing) return;

    const destinationId = getDestinationId(selectedFavorite);

    if (!destinationId) {
      setPageError("This destination has no valid ID and cannot be removed.");
      return;
    }

    setRemoving(true);
    setPageError("");

    try {
      const removed = await unsaveFavorite();

      if (!removed) {
        setPageError("Unable to remove this destination. Please try again.");
        return;
      }

      // The shared hook has already updated the collection.
      setSelectedFavorite(null);
    } catch (err) {
      setPageError(err?.message || "Unable to remove this destination.");
    } finally {
      setRemoving(false);
    }
  }

  async function handleRemoveEvent(eventId) {
    if (!eventId || removingEventId) return;

    setRemovingEventId(eventId);
    setEventFavoritesError("");

    try {
      await apiRequest(`event-favorites/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
      });

      setEventFavorites((current) =>
        current.filter(
          (favorite) => getEventId(getFavoriteEvent(favorite)) !== eventId,
        ),
      );
    } catch (err) {
      setEventFavoritesError(
        err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Unable to remove this saved event.",
      );
    } finally {
      setRemovingEventId("");
    }
  }

  async function handleRefresh() {
    setPageError("");

    try {
      await refreshFavorites();
    } catch (err) {
      setPageError(
        err?.message || "Unable to refresh your saved destinations.",
      );
    }
  }

  // Do not render private dashboard content while the session is being
  // checked or after an unauthenticated visitor has been sent to login.
  if (authStatus !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6F8F4] px-5 text-[#183B2A]">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-3 text-center"
        >
          <LoaderCircle size={30} className="animate-spin text-[#18543A]" />
          <p className="text-sm font-semibold">Checking your account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F6F8F4] text-[#183B2A]">
      <Header activeNav="plan-trip" />

      <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-6 sm:px-6 sm:pt-9 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[#6B806F] transition hover:text-[#103C2A] sm:text-sm"
        >
          <ArrowRight size={16} className="rotate-180" />
          Back to dashboard
        </Link>

        {/* Collection introduction */}

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#103C2A] via-[#18543A] to-[#285D43] px-5 py-8 text-white shadow-[0_14px_40px_rgba(16,60,42,0.12)] sm:px-9 sm:py-10 lg:px-11"
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border-[38px] border-white/[0.045]" />

          <div className="pointer-events-none absolute -bottom-36 right-36 h-64 w-64 rounded-full border border-white/[0.08]" />

          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFBD4A]/30 bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFBD4A]">
                <Sparkles size={13} />
                Your personal collection
              </div>

              <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
                Places worth
                <span className="block text-[#FFBD4A]">remembering.</span>
              </h1>

              <p className="mt-3 max-w-lg text-[13px] leading-6 text-white/75 sm:text-sm sm:leading-7">
                Every destination you save stays right here. Build your own
                collection of places to discover across Kaduna State.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm sm:min-w-[190px] sm:p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFBD4A] text-[#103C2A]">
                <Heart size={23} fill="currentColor" />
              </div>

              <div>
                <p className="text-2xl font-extrabold tabular-nums text-white">
                  {loading ? "—" : favorites.length}
                </p>

                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65">
                  Saved places
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Collection toolbar */}

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#A17A34]">
                Your discoveries
              </p>

              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#183B2A] sm:text-2xl">
                Saved destinations
              </h2>

              <p className="mt-1 text-xs text-[#829084] sm:text-sm">
                Your personally selected places across Kaduna.
              </p>
            </div>

            <Link
              href="/explore"
              className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-[#DCE6DA] bg-white px-4 text-xs font-bold text-[#315B43] transition hover:border-[#AFC6B0] hover:bg-[#F0F5EF] sm:self-auto"
            >
              Discover more
              <ArrowRight size={15} />
            </Link>
          </div>

          {!loading && favorites.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E6ECE4] bg-white p-3 shadow-[0_3px_14px_rgba(16,60,42,0.025)] sm:flex-row sm:items-center sm:p-3.5">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91A095]"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your saved destinations..."
                  aria-label="Search saved destinations"
                  className="h-11 w-full rounded-xl border border-transparent bg-[#F5F8F4] pl-10 pr-10 text-sm text-[#244B38] outline-none transition placeholder:text-[#A1ADA3] focus:border-[#A9C5AA] focus:bg-white focus:ring-4 focus:ring-[#103C2A]/5"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#849187] hover:bg-[#EAF0E8]"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="relative flex shrink-0 items-center">
                <SlidersHorizontal
                  size={15}
                  className="pointer-events-none absolute left-3 text-[#738578]"
                />

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort saved destinations"
                  className="h-11 w-full appearance-none rounded-xl border border-[#E7ECE5] bg-white pl-9 pr-10 text-xs font-bold text-[#526B59] outline-none transition focus:border-[#A9C5AA] sm:w-[175px]"
                >
                  <option value="newest">Recently saved</option>
                  <option value="oldest">Oldest saved</option>
                  <option value="alphabetical">Name A to Z</option>
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 text-[#738578]"
                />
              </div>
            </div>
          )}
        </section>

        {/* Errors */}

        {(error || pageError) && (
          <div
            role="alert"
            className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="min-w-0 break-words">{pageError || error}</p>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold transition hover:bg-red-100"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* Destination collection */}

        <section className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SavedCardSkeleton key={index} />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <EmptyCollection />
          ) : visibleFavorites.length === 0 ? (
            <div className="rounded-2xl border border-[#E5EBE4] bg-white px-5 py-14 text-center">
              <Search size={30} className="mx-auto text-[#8A9A8C]" />

              <h3 className="mt-4 text-lg font-extrabold text-[#183B2A]">
                No matching destinations
              </h3>

              <p className="mt-2 text-sm text-[#849187]">
                Try a different name, location or category.
              </p>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-5 text-sm font-bold text-[#087747] hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold text-[#849187]">
                  Showing{" "}
                  <span className="font-extrabold text-[#315B43]">
                    {visibleFavorites.length}
                  </span>{" "}
                  {visibleFavorites.length === 1
                    ? "destination"
                    : "destinations"}
                </p>
              </div>

              <motion.div
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: reduceMotion ? 0 : 0.07,
                    },
                  },
                }}
                className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
              >
                {visibleFavorites.map((favorite, index) => (
                  <SavedDestinationCard
                    key={favorite._id || getDestinationId(favorite)}
                    favorite={favorite}
                    index={index}
                    reduceMotion={reduceMotion}
                    onRequestRemove={setSelectedFavorite}
                  />
                ))}
              </motion.div>
            </>
          )}
        </section>

        {/* Saved events */}

        <section className="mt-12 border-t border-[#E4EAE2] pt-9">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.19em] text-[#A17A34]">
                Experiences you bookmarked
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#183B2A] sm:text-2xl">
                Saved events
              </h2>
              <p className="mt-1 text-xs text-[#829084] sm:text-sm">
                Events you have saved from the Events page.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-[#DCE6DA] bg-white px-4 text-xs font-bold text-[#315B43] transition hover:border-[#AFC6B0] hover:bg-[#F0F5EF] sm:self-auto"
            >
              Explore events
              <ArrowRight size={15} />
            </Link>
          </div>

          {eventFavoritesError && (
            <div
              role="alert"
              className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="min-w-0 break-words">{eventFavoritesError}</p>
              <button
                type="button"
                onClick={loadEventFavorites}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold transition hover:bg-red-100"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          )}

          {eventFavoritesLoading ? (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SavedCardSkeleton key={`event-skeleton-${index}`} />
              ))}
            </div>
          ) : eventFavorites.length === 0 ? (
            <div className="mt-5 rounded-[26px] border border-dashed border-[#D5E0D4] bg-white px-5 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF2E9] text-[#18543A]">
                <Bookmark size={29} strokeWidth={1.6} />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-[#183B2A]">
                No saved events yet
              </h3>
              <p className="mx-auto mt-2 max-w-[390px] text-sm leading-6 text-[#849187]">
                Save events that interest you and they will appear here
                alongside your saved destinations.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#103C2A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#18543A]"
              >
                Browse events
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 mt-5 text-xs font-semibold text-[#849187]">
                Showing{" "}
                <span className="font-extrabold text-[#315B43]">
                  {eventFavorites.length}
                </span>{" "}
                {eventFavorites.length === 1 ? "event" : "events"}
              </p>

              <motion.div
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: reduceMotion ? 0 : 0.07,
                    },
                  },
                }}
                className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
              >
                {eventFavorites.map((favorite, index) => {
                  const event = getFavoriteEvent(favorite);
                  const eventId = getEventId(event);

                  return (
                    <SavedEventCard
                      key={favorite._id || eventId}
                      favorite={favorite}
                      index={index}
                      reduceMotion={reduceMotion}
                      onRemove={handleRemoveEvent}
                      removing={removingEventId === eventId}
                    />
                  );
                })}
              </motion.div>
            </>
          )}
        </section>

        <div className="mt-10 flex flex-col items-center justify-center gap-2 border-t border-[#E4EAE2] pt-7 text-center">
          <div className="flex items-center gap-2 text-[#A17A34]">
            <Sparkles size={14} />

            <span className="text-[10px] font-extrabold uppercase tracking-[0.17em]">
              Kaduna Explorer
            </span>
          </div>

          <p className="text-xs text-[#93A095]">
            Your discoveries. Your collection. Your Kaduna.
          </p>
        </div>
      </div>

      <Footer />

      {selectedFavorite && (
        <RemoveConfirmation
          destinationName={
            getDestination(selectedFavorite)?.name || "this destination"
          }
          loading={removing}
          reduceMotion={reduceMotion}
          onCancel={() => {
            if (!removing) setSelectedFavorite(null);
          }}
          onConfirm={handleConfirmRemove}
        />
      )}
    </main>
  );
}
